/**
 * Domain-to-App normalization.
 * Maps raw domains to canonical application identities.
 */

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
