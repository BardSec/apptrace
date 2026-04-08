/**
 * Domain-to-App normalization.
 * Maps raw domains to canonical application identities.
 * Enhanced with DB-backed matching and unknown app creation.
 */

import { prisma } from "@/lib/prisma";
import { DOMAIN_RULES, type DomainRule } from "./domain-rules";

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
 * Matches a domain to an existing DomainAlias -> WebApp in the database.
 * Returns the webAppId if found, null otherwise.
 */
export async function matchDomain(domain: string): Promise<string | null> {
  const cleaned = domain.toLowerCase().trim();

  // Direct lookup
  const alias = await prisma.domainAlias.findUnique({
    where: { domain: cleaned },
    select: { webAppId: true },
  });
  if (alias) return alias.webAppId;

  // Try base domain
  const base = extractBaseDomain(cleaned);
  if (base !== cleaned) {
    const baseAlias = await prisma.domainAlias.findUnique({
      where: { domain: base },
      select: { webAppId: true },
    });
    if (baseAlias) return baseAlias.webAppId;
  }

  // Try matching via primary domain on WebApp
  const app = await prisma.webApp.findFirst({
    where: {
      OR: [{ primaryDomain: cleaned }, { primaryDomain: base }],
    },
    select: { id: true },
  });
  if (app) return app.id;

  return null;
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
    await prisma.domainAlias.create({
      data: {
        domain: cleaned,
        webAppId: app.id,
        isPrimary: false,
        isCanonical: false,
        domainType: "UNKNOWN",
      },
    }).catch(() => {
      // Ignore if alias already exists (unique constraint)
    });
  }

  return app.id;
}
