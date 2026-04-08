/**
 * Palo Alto NGFW traffic log CSV ingestion adapter.
 * Parses CSV exports from Monitor > Logs > Traffic in Panorama / PAN-OS
 * and maps PAN-OS App-ID values to AppTrace's data model.
 */

import { type AppCategory } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface PaloAltoRow {
  timestamp: Date;
  sourceIp: string;
  destinationIp: string;
  sourceUser: string | null;
  application: string;
  rule: string;
  action: "allow" | "deny" | "drop";
  destinationPort: number;
  protocol: string;
  bytes: number;
  bytesSent: number;
  bytesReceived: number;
  elapsedTime: number;
  appCategory: string;
  appSubcategory: string;
  appRisk: number;
  isSaas: boolean;
  isTunneled: boolean;
  schoolCode: string | null;
}

// ─── PAN-OS App-ID to AppTrace Mapping ─────────────────────────────

export const APP_ID_MAP: Record<string, { name: string; domain: string; category: AppCategory }> = {
  "google-base": { name: "Google Services", domain: "google.com", category: "PRODUCTIVITY" },
  "ms-office365-base": { name: "Microsoft 365", domain: "office.com", category: "PRODUCTIVITY" },
  "ms-teams": { name: "Microsoft Teams", domain: "teams.microsoft.com", category: "COMMUNICATION" },
  "outlook-web-online": { name: "Outlook Web", domain: "outlook.office.com", category: "COMMUNICATION" },
  "ms-onedrive-business": { name: "OneDrive", domain: "onedrive.live.com", category: "PRODUCTIVITY" },
  "youtube-base": { name: "YouTube", domain: "youtube.com", category: "VIDEO" },
  "gmail-base": { name: "Gmail", domain: "gmail.com", category: "COMMUNICATION" },
  "canvas": { name: "Canvas LMS", domain: "instructure.com", category: "LMS" },
  "facebook-base": { name: "Facebook", domain: "facebook.com", category: "SOCIAL_MEDIA" },
  "sharepoint-online": { name: "SharePoint", domain: "sharepoint.com", category: "PRODUCTIVITY" },
  "google-docs-base": { name: "Google Docs", domain: "docs.google.com", category: "PRODUCTIVITY" },
  "icloud-base": { name: "iCloud", domain: "icloud.com", category: "UTILITY" },
  "apple-maps": { name: "Apple Maps", domain: "maps.apple.com", category: "UTILITY" },
  "itunes-base": { name: "iTunes/App Store", domain: "itunes.apple.com", category: "UTILITY" },
  "microsoft-intune": { name: "Microsoft Intune", domain: "intune.microsoft.com", category: "UTILITY" },
  "ms-update": { name: "Microsoft Update", domain: "update.microsoft.com", category: "CDN_INFRASTRUCTURE" },
  "ms-store": { name: "Microsoft Store", domain: "microsoft.com", category: "UTILITY" },
  "dns-over-https": { name: "DNS over HTTPS", domain: "dns.google.com", category: "UTILITY" },
  "aws-iot": { name: "AWS IoT", domain: "amazonaws.com", category: "CDN_INFRASTRUCTURE" },
  "ssl": { name: "SSL/TLS Traffic", domain: "encrypted-traffic", category: "UNKNOWN" },
  "web-browsing": { name: "Web Browsing", domain: "web-browsing", category: "UNKNOWN" },
  "quic-base": { name: "QUIC Protocol", domain: "quic-traffic", category: "CDN_INFRASTRUCTURE" },
  "google-drive-web": { name: "Google Drive", domain: "drive.google.com", category: "PRODUCTIVITY" },
  "google-classroom": { name: "Google Classroom", domain: "classroom.google.com", category: "LMS" },
  "zoom": { name: "Zoom", domain: "zoom.us", category: "COMMUNICATION" },
  "snapchat-base": { name: "Snapchat", domain: "snapchat.com", category: "SOCIAL_MEDIA" },
  "instagram-base": { name: "Instagram", domain: "instagram.com", category: "SOCIAL_MEDIA" },
  "tiktok-base": { name: "TikTok", domain: "tiktok.com", category: "SOCIAL_MEDIA" },
  "twitter-base": { name: "Twitter/X", domain: "x.com", category: "SOCIAL_MEDIA" },
  "spotify-base": { name: "Spotify", domain: "spotify.com", category: "VIDEO" },
  "netflix-base": { name: "Netflix", domain: "netflix.com", category: "VIDEO" },
  "apple-push-notifications": { name: "Apple Push", domain: "push.apple.com", category: "CDN_INFRASTRUCTURE" },
  "google-analytics": { name: "Google Analytics", domain: "analytics.google.com", category: "ANALYTICS" },
  "cloudflare-base": { name: "Cloudflare", domain: "cloudflare.com", category: "CDN_INFRASTRUCTURE" },
  "akamai-base": { name: "Akamai", domain: "akamai.com", category: "CDN_INFRASTRUCTURE" },
};

// ─── School Code Mapping ───────────────────────────────────────────

/**
 * Maps 2-letter school codes found in PAN-OS rule names to school name keywords.
 * These are used to search the School table.
 */
export const SCHOOL_CODE_MAP: Record<string, string> = {
  FH: "Foothills",
  MH: "Maryville High",
  CG: "Coulter Grove",
  JS: "John Sevier",
  MJ: "Maryville Junior",
  MR: "Montgomery Ridge",
  SH: "Sam Houston",
};

// ─── Noise Filters ─────────────────────────────────────────────────

/**
 * PAN-OS App-IDs that represent infrastructure noise and should be skipped.
 * These don't represent meaningful student app usage.
 */
const NOISE_APP_IDS = new Set([
  "not-applicable",
  "incomplete",
  "dns-base",
  "ntp-base",
  "ocsp",
  "stun",
  "windows-push-notifications",
  "windows-defender-atp-endpoint",
]);

/**
 * Generic / anonymous usernames that should not be treated as individual students.
 */
const GENERIC_USERS = new Set([
  "anonymous",
  "cgisstudent",
  "fhestudent",
  "mhstudent",
  "jsstudent",
  "mjstudent",
  "mrstudent",
  "shstudent",
  "cgstudent",
  "guest",
]);

// ─── CSV Parsing ───────────────────────────────────────────────────

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

// ─── Date Parsing ──────────────────────────────────────────────────

/**
 * Parse PAN-OS timestamp format: "2026/04/08 11:50:04"
 */
function parsePaloAltoDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Format: YYYY/MM/DD HH:MM:SS
  const match = trimmed.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;

  const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const second = parseInt(secStr, 10);

  const date = new Date(year, month, day, hour, minute, second);
  if (isNaN(date.getTime())) return null;
  return date;
}

// ─── Field Extraction Helpers ──────────────────────────────────────

/**
 * Extract the 2-letter school code from a PAN-OS rule name.
 * e.g., "OUT_Wireless_Student_FH" -> "FH", "OUT_Wired_MH" -> "MH"
 */
export function extractSchoolCode(rule: string): string | null {
  if (!rule) return null;
  const parts = rule.split("_");
  if (parts.length < 2) return null;

  const lastPart = parts[parts.length - 1].toUpperCase();
  // School codes are exactly 2 uppercase letters
  if (/^[A-Z]{2}$/.test(lastPart) && SCHOOL_CODE_MAP[lastPart]) {
    return lastPart;
  }
  return null;
}

/**
 * Clean the Source User field from PAN-OS.
 * Strips "mcs\" AD domain prefix and filters out generic accounts.
 * Returns null if the user should be skipped.
 */
export function cleanSourceUser(rawUser: string): string | null {
  if (!rawUser || rawUser === "" || rawUser === "-") return null;

  let cleaned = rawUser.trim();

  // Strip AD domain prefix (e.g., "mcs\26abdeea" -> "26abdeea")
  const backslashIdx = cleaned.indexOf("\\");
  if (backslashIdx !== -1) {
    cleaned = cleaned.substring(backslashIdx + 1);
  }

  cleaned = cleaned.toLowerCase();

  // Skip generic/anonymous accounts
  if (GENERIC_USERS.has(cleaned)) return null;

  return cleaned;
}

// ─── Format Detection ──────────────────────────────────────────────

/**
 * Detect whether a set of CSV headers match Palo Alto traffic log format.
 * Handles BOM in the first header.
 */
export function isPaloAltoFormat(headers: string[]): boolean {
  const lower = headers.map((h) =>
    h.toLowerCase().trim().replace(/^\uFEFF/, "")
  );

  // Key headers that identify a PAN-OS traffic log export
  const required = [
    "source address",
    "destination address",
    "application",
    "action",
    "rule",
    "generate time",
  ];

  const matchCount = required.filter((r) => lower.includes(r)).length;
  return matchCount >= 4;
}

// ─── Main Parser ───────────────────────────────────────────────────

/**
 * Parse a Palo Alto NGFW traffic log CSV export into structured rows.
 * Handles UTF-8 BOM, 117-column format, and filters infrastructure noise.
 */
export function parsePaloAltoCsv(content: string): PaloAltoRow[] {
  // Strip BOM if present
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headerFields = parseCSVLine(lines[0]);
  if (!isPaloAltoFormat(headerFields)) {
    throw new Error(
      "CSV does not match Palo Alto traffic log format. Expected headers: Generate Time, Source address, Destination address, Application, Rule, Action"
    );
  }

  // Build header index map (strip BOM from first header)
  const headerIndex = new Map<string, number>();
  headerFields.forEach((h, i) => {
    const key = h.toLowerCase().trim().replace(/^\uFEFF/, "");
    headerIndex.set(key, i);
  });

  const getField = (fields: string[], name: string): string => {
    const idx = headerIndex.get(name);
    if (idx === undefined || idx >= fields.length) return "";
    return fields[idx].trim();
  };

  const rows: PaloAltoRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 10) continue; // Skip malformed rows

    const application = getField(fields, "application").toLowerCase();

    // Filter noise App-IDs
    if (NOISE_APP_IDS.has(application)) continue;

    const rawTimestamp = getField(fields, "generate time");
    const timestamp = parsePaloAltoDate(rawTimestamp);
    if (!timestamp) continue; // Skip rows with unparseable dates

    const rawAction = getField(fields, "action").toLowerCase();
    const action: "allow" | "deny" | "drop" =
      rawAction === "deny" ? "deny" : rawAction === "drop" ? "drop" : "allow";

    const rule = getField(fields, "rule");
    const schoolCode = extractSchoolCode(rule);

    const rawUser = getField(fields, "source user");
    const sourceUser = cleanSourceUser(rawUser);

    const bytesStr = getField(fields, "bytes");
    const bytesSentStr = getField(fields, "bytes sent");
    const bytesReceivedStr = getField(fields, "bytes received");
    const elapsedStr = getField(fields, "elapsed time (sec)");
    const riskStr = getField(fields, "risk of app");
    const destPortStr = getField(fields, "destination port");

    const saasField = getField(fields, "saas of app").toLowerCase();
    const tunneledField = getField(fields, "tunneled app").toLowerCase();

    rows.push({
      timestamp,
      sourceIp: getField(fields, "source address"),
      destinationIp: getField(fields, "destination address"),
      sourceUser,
      application,
      rule,
      action,
      destinationPort: parseInt(destPortStr, 10) || 0,
      protocol: getField(fields, "ip protocol"),
      bytes: parseInt(bytesStr, 10) || 0,
      bytesSent: parseInt(bytesSentStr, 10) || 0,
      bytesReceived: parseInt(bytesReceivedStr, 10) || 0,
      elapsedTime: parseInt(elapsedStr, 10) || 0,
      appCategory: getField(fields, "category of app"),
      appSubcategory: getField(fields, "subcategory of app"),
      appRisk: parseInt(riskStr, 10) || 1,
      isSaas: saasField === "yes" || saasField === "true" || saasField === "1",
      isTunneled: tunneledField === "yes" || tunneledField === "true" || tunneledField !== "" && tunneledField !== "no" && tunneledField !== "0" && tunneledField !== "n/a",
      schoolCode,
    });
  }

  return rows;
}

// ─── PAN-OS Subcategory to AppCategory Mapping ─────────────────────

const PAN_SUBCATEGORY_MAP: Record<string, AppCategory> = {
  "encrypted-tunnel": "CDN_INFRASTRUCTURE",
  email: "COMMUNICATION",
  "file-sharing": "PRODUCTIVITY",
  "instant-messaging": "COMMUNICATION",
  "internet-utility": "UTILITY",
  "photo-video": "VIDEO",
  "social-networking": "SOCIAL_MEDIA",
  gaming: "GAMING",
  "web-posting": "SOCIAL_MEDIA",
  "audio-streaming": "VIDEO",
  "video-streaming": "VIDEO",
  "business-systems": "PRODUCTIVITY",
  "office-programs": "PRODUCTIVITY",
  "software-update": "CDN_INFRASTRUCTURE",
  "remote-access": "UTILITY",
  "ip-protocol": "CDN_INFRASTRUCTURE",
  management: "UTILITY",
};

/**
 * Map a PAN-OS subcategory to an AppTrace category.
 * Used as a fallback when the App-ID is not in the APP_ID_MAP.
 */
export function mapPanSubcategory(subcategory: string): AppCategory {
  const lower = subcategory.toLowerCase().trim();
  return PAN_SUBCATEGORY_MAP[lower] ?? "UNKNOWN";
}
