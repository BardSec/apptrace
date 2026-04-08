/**
 * Securly CSV ingestion adapter.
 * Parses CSV exports from Securly admin dashboard (Reports > Activity > Export)
 * and maps them to AppTrace's data model.
 */

import { type AppCategory } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface SecurlyRow {
  timestamp: Date;
  type: "allowed" | "blocked" | "invalid";
  reason: string;
  policy: string;
  category: string;
  domain: string;
  fullUrl: string;
  path: string;
  ipAddress: string;
  studentName: string | null;
  studentEmail: string | null;
  locationStatus: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const SECURLY_HEADERS = [
  "date",
  "type",
  "reason",
  "custom group",
  "policy",
  "keyword",
  "category",
  "site name",
  "path",
  "ip address",
  "user",
  "status",
];

/**
 * Known ad/tracking domains to filter. Observations are still created
 * for audit trail but are auto-categorized as ADVERTISING with low concern.
 */
export const AD_TRACKING_DOMAINS = new Set([
  "adnxs.com",
  "pubmatic.com",
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "facebook.net",
  "adform.net",
  "adsrvr.org",
  "amazon-adsystem.com",
  "adthrive.com",
  "betweendigital.com",
  "revjet.com",
  "servenobid.com",
  "stickyadstv.com",
  "360yield.com",
  "3lift.com",
  "1rx.io",
  "ad-delivery.net",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "bidswitch.net",
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "sharethrough.com",
  "indexexchange.com",
  "smartadserver.com",
]);

// ─── CSV Parsing ────────────────────────────────────────────────────

/**
 * Parse a single CSV line handling quoted fields that contain commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Date Parsing ───────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Parse Securly date format: "Apr 08, 2026-11:25"
 * The field is quoted in CSV because it contains a comma.
 */
function parseSecurlyDate(raw: string): Date | null {
  // Format: "Apr 08, 2026-11:25"
  const match = raw.match(
    /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})-(\d{1,2}):(\d{2})$/
  );
  if (!match) return null;

  const [, monthStr, dayStr, yearStr, hourStr, minStr] = match;
  const month = MONTH_MAP[monthStr];
  if (month === undefined) return null;

  const year = parseInt(yearStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);

  const date = new Date(year, month, day, hour, minute);
  if (isNaN(date.getTime())) return null;
  return date;
}

// ─── Domain Extraction ──────────────────────────────────────────────

/**
 * Extract domain from a Securly "Site Name" field.
 * Site Name is a full URL like "https://google.com" or "http://example.com/path".
 */
function extractDomainFromSiteName(siteName: string): string {
  let cleaned = siteName.trim();

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, "");

  // Take everything before the first /
  const slashIdx = cleaned.indexOf("/");
  if (slashIdx !== -1) {
    cleaned = cleaned.substring(0, slashIdx);
  }

  // Strip port if present
  const colonIdx = cleaned.indexOf(":");
  if (colonIdx !== -1) {
    cleaned = cleaned.substring(0, colonIdx);
  }

  return cleaned.toLowerCase();
}

/**
 * Get the base domain (registrable domain) from a full hostname.
 * e.g., "cdn.adnxs.com" -> "adnxs.com"
 */
function getBaseDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  // Return last two parts as a simple heuristic
  return parts.slice(-2).join(".");
}

/**
 * Check if a domain is a known ad/tracking domain.
 */
export function isAdTrackingDomain(domain: string): boolean {
  const base = getBaseDomain(domain);
  return AD_TRACKING_DOMAINS.has(base);
}

// ─── User Field Parsing ─────────────────────────────────────────────

/**
 * Parse the Securly User field: "Noah Jackson, 26jacknr@students.maryville-schools.org"
 * Returns { name, email } or { name: null, email: null } if unparseable.
 */
function parseUserField(user: string): {
  name: string | null;
  email: string | null;
} {
  if (!user || user === "-" || user === "") {
    return { name: null, email: null };
  }

  // The field format is "Name, email" — split on ", "
  const commaIdx = user.indexOf(", ");
  if (commaIdx === -1) {
    // Maybe it's just an email
    if (user.includes("@")) {
      return { name: null, email: user.trim().toLowerCase() };
    }
    return { name: user.trim(), email: null };
  }

  const firstPart = user.substring(0, commaIdx).trim();
  const secondPart = user.substring(commaIdx + 2).trim();

  // Figure out which part is the email
  if (secondPart.includes("@")) {
    return { name: firstPart, email: secondPart.toLowerCase() };
  } else if (firstPart.includes("@")) {
    return { name: secondPart, email: firstPart.toLowerCase() };
  }

  return { name: firstPart, email: null };
}

// ─── Category Mapping ───────────────────────────────────────────────

const SECURLY_CATEGORY_MAP: Record<string, AppCategory> = {
  "educational": "LMS",
  "social media": "SOCIAL_MEDIA",
  "games": "GAMING",
  "chat/messaging": "COMMUNICATION",
  "web ads": "ADVERTISING",
  "safe search": "CDN_INFRASTRUCTURE",
  "safe url": "CDN_INFRASTRUCTURE",
  "safe yt": "CDN_INFRASTRUCTURE",
  "general": "UNKNOWN",
  "popular sites": "UNKNOWN",
  "health": "REFERENCE",
  "networking": "REFERENCE",
  "malware": "UNKNOWN",
  "gambling": "UNKNOWN",
  "other adult": "UNKNOWN",
  "streaming": "VIDEO",
  "video": "VIDEO",
  "news": "REFERENCE",
  "search engine": "UTILITY",
  "technology": "REFERENCE",
  "shopping": "UNKNOWN",
  "entertainment": "VIDEO",
  "music": "VIDEO",
  "sports": "REFERENCE",
  "email": "COMMUNICATION",
  "productivity": "PRODUCTIVITY",
  "business": "PRODUCTIVITY",
  "cloud storage": "PRODUCTIVITY",
  "developer": "UTILITY",
};

/**
 * Map a Securly category string to an AppCategory enum value.
 */
export function mapSecurlyCategory(securlyCategory: string): AppCategory {
  const lower = securlyCategory.toLowerCase().trim();
  return SECURLY_CATEGORY_MAP[lower] ?? "UNKNOWN";
}

// ─── Format Detection ───────────────────────────────────────────────

/**
 * Detect whether a set of CSV headers match Securly's export format.
 */
export function isSecurlyFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  // Require at least these key headers
  const required = ["date", "type", "category", "site name", "user", "status"];
  const matchCount = required.filter((r) => lower.includes(r)).length;
  return matchCount >= 4;
}

// ─── Main Parser ────────────────────────────────────────────────────

/**
 * Parse a Securly CSV export into structured rows.
 */
export function parseSecurlyCsv(content: string): SecurlyRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headerFields = parseCSVLine(lines[0]);
  if (!isSecurlyFormat(headerFields)) {
    throw new Error(
      "CSV does not match Securly format. Expected headers: Date, Type, Reason, Custom Group, Policy, Keyword, Category, Site Name, Path, IP Address, User, Status"
    );
  }

  // Build header index map
  const headerIndex = new Map<string, number>();
  headerFields.forEach((h, i) => {
    headerIndex.set(h.toLowerCase().trim(), i);
  });

  const getField = (fields: string[], name: string): string => {
    const idx = headerIndex.get(name);
    if (idx === undefined || idx >= fields.length) return "";
    return fields[idx];
  };

  const rows: SecurlyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 6) continue; // Skip malformed rows

    const rawDate = getField(fields, "date");
    const timestamp = parseSecurlyDate(rawDate);
    if (!timestamp) continue; // Skip rows with unparseable dates

    const rawType = getField(fields, "type").toLowerCase();
    const type: "allowed" | "blocked" | "invalid" =
      rawType === "blocked"
        ? "blocked"
        : rawType === "invalid"
          ? "invalid"
          : "allowed";

    const reason = getField(fields, "reason");
    const policy = getField(fields, "policy");
    const category = getField(fields, "category");
    const siteName = getField(fields, "site name");
    const path = getField(fields, "path");
    const ipAddress = getField(fields, "ip address");
    const userField = getField(fields, "user");
    const status = getField(fields, "status");

    const domain = extractDomainFromSiteName(siteName);
    if (!domain) continue;

    const { name: studentName, email: studentEmail } =
      parseUserField(userField);

    rows.push({
      timestamp,
      type,
      reason,
      policy,
      category,
      domain,
      fullUrl: siteName + (path || ""),
      path,
      ipAddress,
      studentName,
      studentEmail,
      locationStatus: status,
    });
  }

  return rows;
}

// ─── Policy to School Mapping ───────────────────────────────────────

/**
 * Map a Securly policy name to a school name search pattern.
 * Returns a keyword to search the School table, or null if unmappable.
 */
export function policyToSchoolKeyword(policy: string): string | null {
  const lower = policy.toLowerCase().trim();

  if (lower.includes("high school") || lower === "high school") return "High";
  if (lower.includes("elementary")) return "Elementary";
  if (lower.includes("junior high") || lower.includes("intermediate"))
    return "Middle";
  if (lower.includes("coulter grove")) return "Coulter Grove";

  // Staff, Base/Default, Global don't map to a specific school
  if (
    lower.includes("staff") ||
    lower.includes("base") ||
    lower.includes("default") ||
    lower.includes("global")
  ) {
    return null;
  }

  // Try using the policy name directly as a keyword
  if (policy.trim().length > 2) return policy.trim();

  return null;
}
