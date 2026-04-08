/**
 * Domain-to-App normalization.
 * Maps raw domains to canonical application identities.
 * Enhanced with DB-backed matching, rule-based matching, and unknown app creation.
 */

import { prisma } from "@/lib/prisma";
import { DOMAIN_RULES, type DomainRule } from "./domain-rules";
import { type AppCategory, type DomainType } from "@prisma/client";

export interface NormalizedApp {
  canonicalName: string;
  vendor: string;
  domains: string[];
}

export function normalizeDomain(domain: string): NormalizedApp | null {
  const rule = DOMAIN_RULES.find((r) => r.pattern.test(domain));
  if (!rule) return null;

  return {
    canonicalName: rule.appName,
    vendor: rule.vendor,
    domains: [domain],
  };
}

const STRIP_SUBDOMAINS = new Set([
  "www",
  "app",
  "login",
  "cdn",
  "api",
  "static",
  "assets",
  "media",
  "auth",
  "sso",
  "portal",
  "m",
  "mobile",
  "web",
]);

/**
 * Strips common subdomains to get the meaningful base domain.
 * e.g., "www.app.kahoot.it" -> "kahoot.it"
 */
export function extractBaseDomain(domain: string): string {
  const cleaned = domain.toLowerCase().trim().replace(/\.$/, "");
  const parts = cleaned.split(".");

  if (parts.length <= 2) return cleaned;

  // Handle known multi-part TLDs like .co.uk, .com.au
  const knownTLDs = ["co.uk", "com.au", "co.nz", "org.uk", "ac.uk", "edu.au"];
  const lastTwo = parts.slice(-2).join(".");
  const minParts = knownTLDs.includes(lastTwo) ? 3 : 2;

  // Strip leading subdomains that are in the strip list
  let startIdx = 0;
  while (parts.length - startIdx > minParts && STRIP_SUBDOMAINS.has(parts[startIdx])) {
    startIdx++;
  }

  return parts.slice(startIdx).join(".");
}

/**
 * In-memory cache scoped to the request lifecycle.
 * Prevents repeated DB lookups for the same domain within a single ingestion batch.
 */
const requestCache = new Map<string, string | null>();

/**
 * Clear the request-scoped cache. Call this at the start of each request.
 */
export function clearDomainCache(): void {
  requestCache.clear();
}

/**
 * Find a matching DomainRule for the given domain.
 */
function findMatchingRule(domain: string): DomainRule | null {
  const cleaned = domain.toLowerCase().trim();
  return DOMAIN_RULES.find((r) => r.pattern.test(cleaned)) ?? null;
}

/**
 * Matches a domain to an existing DomainAlias -> WebApp in the database.
 * Falls back to domain-rules.ts patterns if no DB match is found.
 * If a rule matches but no WebApp exists, auto-creates the WebApp.
 * Returns the webAppId if found or created, null otherwise.
 */
export async function matchDomain(domain: string): Promise<string | null> {
  const cleaned = domain.toLowerCase().trim();

  // Check in-memory cache first
  if (requestCache.has(cleaned)) {
    return requestCache.get(cleaned) ?? null;
  }

  // 1. Direct DB lookup
  const alias = await prisma.domainAlias.findUnique({
    where: { domain: cleaned },
    select: { webAppId: true },
  });
  if (alias) {
    requestCache.set(cleaned, alias.webAppId);
    return alias.webAppId;
  }

  // 2. Try base domain in DB
  const base = extractBaseDomain(cleaned);
  if (base !== cleaned) {
    const baseAlias = await prisma.domainAlias.findUnique({
      where: { domain: base },
      select: { webAppId: true },
    });
    if (baseAlias) {
      requestCache.set(cleaned, baseAlias.webAppId);
      return baseAlias.webAppId;
    }
  }

  // 3. Try matching via primary domain on WebApp
  const app = await prisma.webApp.findFirst({
    where: {
      OR: [{ primaryDomain: cleaned }, { primaryDomain: base }],
    },
    select: { id: true },
  });
  if (app) {
    requestCache.set(cleaned, app.id);
    return app.id;
  }

  // 4. Check domain-rules.ts patterns
  const rule = findMatchingRule(cleaned);
  if (rule) {
    // Look for an existing WebApp with this canonical app name
    const existingApp = await prisma.webApp.findFirst({
      where: { name: rule.appName },
      select: { id: true },
    });

    if (existingApp) {
      // Create domain alias linking to existing app
      await prisma.domainAlias
        .create({
          data: {
            domain: base,
            webAppId: existingApp.id,
            isPrimary: false,
            isCanonical: false,
            domainType: rule.domainType,
          },
        })
        .catch(() => {
          // Ignore unique constraint violation
        });
      requestCache.set(cleaned, existingApp.id);
      return existingApp.id;
    }

    // Auto-create WebApp from rule metadata
    const newApp = await createAppFromRule(base, rule);
    requestCache.set(cleaned, newApp);
    return newApp;
  }

  // No match found
  requestCache.set(cleaned, null);
  return null;
}

/**
 * Creates a WebApp from a domain rule with proper metadata.
 */
async function createAppFromRule(
  baseDomain: string,
  rule: DomainRule
): Promise<string> {
  const now = new Date();

  const app = await prisma.webApp.create({
    data: {
      name: rule.appName,
      primaryDomain: baseDomain,
      category: rule.category as AppCategory,
      approvalStatus: "UNKNOWN",
      firstSeenAt: now,
      lastSeenAt: now,
      domainAliases: {
        create: {
          domain: baseDomain,
          isPrimary: true,
          isCanonical: true,
          domainType: rule.domainType as DomainType,
        },
      },
    },
  });

  return app.id;
}

/**
 * Creates a new WebApp with UNKNOWN status from an unrecognized domain.
 * Also creates a DomainAlias linking the domain to the new app.
 * Returns the new webAppId.
 */
export async function createUnknownApp(domain: string): Promise<string> {
  const cleaned = domain.toLowerCase().trim();
  const base = extractBaseDomain(cleaned);

  // Derive a name from the base domain (strip TLD, capitalize)
  const nameParts = base.split(".");
  const rawName = nameParts[0];
  const appName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const now = new Date();

  const app = await prisma.webApp.create({
    data: {
      name: appName,
      primaryDomain: base,
      category: "UNKNOWN",
      approvalStatus: "UNKNOWN",
      firstSeenAt: now,
      lastSeenAt: now,
      domainAliases: {
        create: {
          domain: base,
          isPrimary: true,
          isCanonical: true,
          domainType: "UNKNOWN",
        },
      },
    },
  });

  // If the original domain is different from the base, also create an alias for it
  if (cleaned !== base) {
    await prisma.domainAlias
      .create({
        data: {
          domain: cleaned,
          webAppId: app.id,
          isPrimary: false,
          isCanonical: false,
          domainType: "UNKNOWN",
        },
      })
      .catch(() => {
        // Ignore if alias already exists (unique constraint)
      });
  }

  // Cache the result
  requestCache.set(cleaned, app.id);

  return app.id;
}
