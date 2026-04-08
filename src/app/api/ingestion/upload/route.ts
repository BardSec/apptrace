import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  matchDomain,
  createUnknownApp,
  extractBaseDomain,
  clearDomainCache,
} from "@/services/normalization";
import { classifyApp } from "@/services/classification";

// --- Types ---

type ParsedRow = {
  timestamp: Date;
  domain: string;
  sourceIp?: string;
  userEmail?: string;
  fullUrl?: string;
  queryType?: string;
};

type UploadResult = {
  totalRows: number;
  imported: number;
  matched: number;
  unmatched: number;
  errors: number;
};

// --- Format Detection ---

type FileFormat = "dns" | "sso" | "generic";

const DNS_HEADERS = [
  "query",
  "domain",
  "query_type",
  "source_ip",
  "client_ip",
  "record_type",
  "dns_query",
  "qname",
  "queryname",
  "request_domain",
];

const SSO_HEADERS = [
  "user_email",
  "email",
  "user",
  "app_name",
  "application",
  "event_type",
  "action",
  "login",
  "logout",
  "sso",
  "idp",
];

function detectFormat(headers: string[]): FileFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const dnsScore = lower.filter((h) => DNS_HEADERS.some((d) => h.includes(d))).length;
  const ssoScore = lower.filter((h) => SSO_HEADERS.some((s) => h.includes(s))).length;

  if (ssoScore >= 2) return "sso";
  if (dnsScore >= 2) return "dns";
  return "generic";
}

function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

// --- CSV Parsing ---

function parseCSVLine(line: string, delimiter: string): string[] {
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
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function findColumn(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  // Partial match
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseTimestamp(value: string): Date | null {
  if (!value) return null;
  // Try ISO 8601 first
  const iso = new Date(value);
  if (!isNaN(iso.getTime())) return iso;
  // Try epoch seconds
  const num = Number(value);
  if (!isNaN(num) && num > 1e9 && num < 1e13) return new Date(num * 1000);
  if (!isNaN(num) && num > 1e12) return new Date(num);
  return null;
}

function extractDomainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return url;
  }
}

// --- Row Parsers ---

function parseDNSRow(fields: string[], headers: string[]): ParsedRow | null {
  const tsIdx = findColumn(headers, "timestamp", "time", "date", "datetime", "date_time", "ts");
  const domainIdx = findColumn(
    headers,
    "domain",
    "query",
    "dns_query",
    "qname",
    "queryname",
    "request_domain",
    "question",
    "name"
  );
  const ipIdx = findColumn(headers, "source_ip", "client_ip", "src_ip", "client", "ip", "source");
  const typeIdx = findColumn(headers, "query_type", "record_type", "type", "qtype", "rrtype");
  const urlIdx = findColumn(headers, "url", "full_url", "request_url");

  if (tsIdx === -1 || domainIdx === -1) return null;

  const timestamp = parseTimestamp(fields[tsIdx]);
  const rawDomain = fields[domainIdx]?.replace(/\.$/, "");
  if (!timestamp || !rawDomain) return null;

  const domain = extractDomainFromUrl(rawDomain);

  return {
    timestamp,
    domain,
    sourceIp: ipIdx >= 0 ? fields[ipIdx] : undefined,
    queryType: typeIdx >= 0 ? fields[typeIdx] : undefined,
    fullUrl: urlIdx >= 0 ? fields[urlIdx] : undefined,
  };
}

function parseSSORow(fields: string[], headers: string[]): ParsedRow | null {
  const tsIdx = findColumn(headers, "timestamp", "time", "date", "datetime", "login_time", "event_time", "ts");
  const domainIdx = findColumn(headers, "domain", "app_domain", "app_url", "url");
  const appIdx = findColumn(headers, "app_name", "application", "app", "service", "resource");
  const emailIdx = findColumn(headers, "user_email", "email", "user", "username", "student_email", "actor_email");

  if (tsIdx === -1) return null;

  const timestamp = parseTimestamp(fields[tsIdx]);
  if (!timestamp) return null;

  // Domain might come from domain column or app_name column
  let domain = "";
  if (domainIdx >= 0 && fields[domainIdx]) {
    domain = extractDomainFromUrl(fields[domainIdx]);
  } else if (appIdx >= 0 && fields[appIdx]) {
    // Use app name as a pseudo-domain (lowercase, no spaces)
    const appName = fields[appIdx].trim();
    if (appName.includes(".")) {
      domain = extractDomainFromUrl(appName);
    } else {
      domain = appName.toLowerCase().replace(/\s+/g, "") + ".com";
    }
  }

  if (!domain) return null;

  return {
    timestamp,
    domain,
    userEmail: emailIdx >= 0 ? fields[emailIdx]?.trim() : undefined,
  };
}

function parseGenericRow(fields: string[], headers: string[]): ParsedRow | null {
  const tsIdx = findColumn(headers, "timestamp", "time", "date", "datetime", "ts");
  const domainIdx = findColumn(headers, "domain", "url", "host", "hostname", "site");

  if (tsIdx === -1 || domainIdx === -1) return null;

  const timestamp = parseTimestamp(fields[tsIdx]);
  const rawDomain = fields[domainIdx];
  if (!timestamp || !rawDomain) return null;

  const domain = extractDomainFromUrl(rawDomain);
  const emailIdx = findColumn(headers, "email", "user_email", "user", "student_email");

  return {
    timestamp,
    domain,
    userEmail: emailIdx >= 0 ? fields[emailIdx]?.trim() : undefined,
  };
}

// --- Source type mapping ---

function mapSourceType(sourceType: string): string {
  const map: Record<string, string> = {
    dns_log: "DNS_LOG",
    sso_log: "SSO_LOG",
    browser_telemetry: "BROWSER_TELEMETRY",
    manual_csv: "CSV_UPLOAD",
    csv_upload: "CSV_UPLOAD",
  };
  return map[sourceType.toLowerCase()] || "CSV_UPLOAD";
}

// --- Main handler ---

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const metadataSchema = z.object({
  sourceType: z.string().min(1),
  schoolId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sourceType = (formData.get("sourceType") as string) || "";
    const schoolId = (formData.get("schoolId") as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const validation = metadataSchema.safeParse({
      sourceType,
      schoolId: schoolId || undefined,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid metadata", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "File must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCSVLine(lines[0], delimiter);
    const format = detectFormat(headers);

    const parser =
      format === "dns"
        ? parseDNSRow
        : format === "sso"
          ? parseSSORow
          : parseGenericRow;

    const mappedSource = mapSourceType(sourceType);
    const result: UploadResult = {
      totalRows: lines.length - 1,
      imported: 0,
      matched: 0,
      unmatched: 0,
      errors: 0,
    };

    // Process in chunks of 100
    const CHUNK_SIZE = 100;
    const dataLines = lines.slice(1);

    // Clear and use the normalization request cache
    clearDomainCache();

    // Cache domain lookups to avoid repeated DB queries
    const domainCache = new Map<string, string | null>();

    // Track all webAppIds touched during this upload for classification
    const touchedWebAppIds = new Set<string>();

    for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
      const chunk = dataLines.slice(i, i + CHUNK_SIZE);
      const observations: Array<{
        timestamp: Date;
        domain: string;
        fullUrl: string | null;
        sourceType: string;
        schoolId: string | null;
        webAppId: string | null;
        studentId: string | null;
        rawData: Record<string, string> | null;
      }> = [];

      for (const line of chunk) {
        const fields = parseCSVLine(line, delimiter);
        const parsed = parser(fields, headers);

        if (!parsed) {
          result.errors++;
          continue;
        }

        // Match domain to WebApp
        const baseDomain = extractBaseDomain(parsed.domain);
        let webAppId: string | null = null;

        if (domainCache.has(baseDomain)) {
          webAppId = domainCache.get(baseDomain) ?? null;
        } else {
          webAppId = await matchDomain(parsed.domain);
          if (!webAppId) {
            // Create unknown app
            webAppId = await createUnknownApp(parsed.domain);
            result.unmatched++;
          } else {
            result.matched++;
          }
          domainCache.set(baseDomain, webAppId);
        }

        // Track touched webAppIds for classification
        if (webAppId) {
          touchedWebAppIds.add(webAppId);
        }

        // If domain was cached, we still need to count matched/unmatched
        if (domainCache.has(baseDomain) && webAppId !== null && !observations.length) {
          // Already counted on first encounter
        }

        // Match student by email if present
        let studentId: string | null = null;
        if (parsed.userEmail) {
          const student = await prisma.student.findFirst({
            where: { email: parsed.userEmail.toLowerCase() },
            select: { id: true },
          });
          if (student) studentId = student.id;
        }

        observations.push({
          timestamp: parsed.timestamp,
          domain: parsed.domain,
          fullUrl: parsed.fullUrl || null,
          sourceType: mappedSource as never,
          schoolId: schoolId || null,
          webAppId,
          studentId,
          rawData: parsed.sourceIp || parsed.queryType
            ? {
                ...(parsed.sourceIp ? { sourceIp: parsed.sourceIp } : {}),
                ...(parsed.queryType ? { queryType: parsed.queryType } : {}),
              }
            : null,
        });
      }

      // Bulk insert observations
      if (observations.length > 0) {
        await prisma.observation.createMany({
          data: observations as never,
        });
        result.imported += observations.length;

        // Update WebApp lastSeenAt and totalObservations for matched apps
        const appIds = Array.from(new Set(observations.map((o) => o.webAppId).filter(Boolean))) as string[];
        for (const appId of appIds) {
          const appObs = observations.filter((o) => o.webAppId === appId);
          const maxTs = appObs.reduce((max, o) => (o.timestamp > max ? o.timestamp : max), appObs[0].timestamp);
          await prisma.webApp.update({
            where: { id: appId },
            data: {
              lastSeenAt: maxTs,
              totalObservations: { increment: appObs.length },
            },
          });
        }
      }
    }

    // Run classification on all touched WebApps
    let classified = 0;
    for (const appId of Array.from(touchedWebAppIds)) {
      try {
        await classifyApp(appId);
        classified++;
      } catch (err) {
        console.error(`Classification failed for app ${appId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      format,
      result: {
        totalRows: result.totalRows,
        imported: result.imported,
        matched: result.matched,
        unmatched: result.unmatched,
        errors: result.errors,
      },
      classified,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
