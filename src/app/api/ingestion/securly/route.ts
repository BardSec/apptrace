import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  matchDomain,
  createUnknownApp,
  extractBaseDomain,
  clearDomainCache,
} from "@/services/normalization";
import { classifyApp } from "@/services/classification";
import {
  parseSecurlyCsv,
  isAdTrackingDomain,
  mapSecurlyCategory,
  policyToSchoolKeyword,
  type SecurlyRow,
} from "@/services/ingestion/adapters/securly";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB — Securly exports can be large

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50MB limit" },
        { status: 400 }
      );
    }

    const text = await file.text();

    let rows: SecurlyRow[];
    try {
      rows = parseSecurlyCsv(text);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Failed to parse Securly CSV",
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in file" },
        { status: 400 }
      );
    }

    // ── Summary tracking ──
    const summary = {
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      skipReason: "ad/tracking domains filtered",
      matched: 0,
      newApps: 0,
      studentsMatched: 0,
      classified: 0,
      errors: 0,
      topDomains: [] as { domain: string; count: number }[],
      blockedCount: 0,
      allowedCount: 0,
    };

    // Count blocked/allowed
    for (const row of rows) {
      if (row.type === "blocked") summary.blockedCount++;
      else if (row.type === "allowed") summary.allowedCount++;
    }

    // Count domain frequency for top domains
    const domainCounts = new Map<string, number>();
    for (const row of rows) {
      const base = extractBaseDomain(row.domain);
      domainCounts.set(base, (domainCounts.get(base) || 0) + 1);
    }
    summary.topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    // ── Caches ──
    clearDomainCache();
    const domainToWebAppId = new Map<string, string>();
    const studentEmailCache = new Map<string, string | null>();
    const schoolKeywordCache = new Map<string, string | null>();
    const touchedWebAppIds = new Set<string>();
    const matchedStudentIds = new Set<string>();

    // Pre-load all schools for policy matching
    const allSchools = await prisma.school.findMany({
      select: { id: true, name: true },
    });

    const findSchoolByKeyword = (keyword: string): string | null => {
      const lower = keyword.toLowerCase();
      const school = allSchools.find((s) =>
        s.name.toLowerCase().includes(lower)
      );
      return school?.id ?? null;
    };

    // ── Process rows in chunks ──
    const CHUNK_SIZE = 100;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const observations: Array<{
        timestamp: Date;
        domain: string;
        fullUrl: string | null;
        sourceType: "DNS_LOG";
        schoolId: string | null;
        webAppId: string | null;
        studentId: string | null;
        rawData: Record<string, unknown>;
      }> = [];

      for (const row of chunk) {
        try {
          const baseDomain = extractBaseDomain(row.domain);
          const isAdDomain = isAdTrackingDomain(row.domain);

          // ── Resolve WebApp ──
          let webAppId: string | null = null;

          if (domainToWebAppId.has(baseDomain)) {
            webAppId = domainToWebAppId.get(baseDomain) ?? null;
          } else {
            webAppId = await matchDomain(row.domain);
            if (!webAppId) {
              webAppId = await createUnknownApp(row.domain);
              summary.newApps++;
            } else {
              summary.matched++;
            }
            domainToWebAppId.set(baseDomain, webAppId);
          }

          if (webAppId) {
            touchedWebAppIds.add(webAppId);
          }

          // ── If ad/tracking domain, create observation but mark as skipped ──
          if (isAdDomain) {
            // Still create the observation for audit trail
            observations.push({
              timestamp: row.timestamp,
              domain: row.domain,
              fullUrl: row.fullUrl || null,
              sourceType: "DNS_LOG",
              schoolId: null,
              webAppId,
              studentId: null,
              rawData: {
                securlyCategory: row.category,
                securlyType: row.type,
                securlyReason: row.reason,
                securlyPolicy: row.policy,
                ipAddress: row.ipAddress,
                locationStatus: row.locationStatus,
                adTrackingFiltered: true,
              },
            });
            summary.skipped++;
            continue;
          }

          // ── Resolve student ──
          let studentId: string | null = null;
          if (row.studentEmail) {
            if (studentEmailCache.has(row.studentEmail)) {
              studentId = studentEmailCache.get(row.studentEmail) ?? null;
            } else {
              const student = await prisma.student.findFirst({
                where: { email: row.studentEmail.toLowerCase() },
                select: { id: true },
              });
              studentId = student?.id ?? null;
              studentEmailCache.set(row.studentEmail, studentId);
            }
            if (studentId) {
              matchedStudentIds.add(studentId);
            }
          }

          // ── Resolve school from policy ──
          let schoolId: string | null = null;
          if (row.policy) {
            if (schoolKeywordCache.has(row.policy)) {
              schoolId = schoolKeywordCache.get(row.policy) ?? null;
            } else {
              const keyword = policyToSchoolKeyword(row.policy);
              if (keyword) {
                schoolId = findSchoolByKeyword(keyword);
              }
              schoolKeywordCache.set(row.policy, schoolId);
            }
          }

          // If we matched a student, use their school as a fallback
          if (!schoolId && studentId) {
            const student = await prisma.student.findUnique({
              where: { id: studentId },
              select: { schoolId: true },
            });
            if (student) schoolId = student.schoolId;
          }

          observations.push({
            timestamp: row.timestamp,
            domain: row.domain,
            fullUrl: row.fullUrl || null,
            sourceType: "DNS_LOG",
            schoolId,
            webAppId,
            studentId,
            rawData: {
              securlyCategory: row.category,
              securlyType: row.type,
              securlyReason: row.reason,
              securlyPolicy: row.policy,
              securlyKeyword: row.path ? undefined : undefined,
              ipAddress: row.ipAddress,
              studentName: row.studentName,
              locationStatus: row.locationStatus,
            },
          });

          summary.imported++;
        } catch (err) {
          console.error("Error processing Securly row:", err);
          summary.errors++;
        }
      }

      // ── Bulk insert observations ──
      if (observations.length > 0) {
        await prisma.observation.createMany({
          data: observations as never,
        });

        // Update WebApp lastSeenAt and totalObservations
        const appIds = Array.from(
          new Set(
            observations.map((o) => o.webAppId).filter(Boolean) as string[]
          )
        );
        for (const appId of appIds) {
          const appObs = observations.filter((o) => o.webAppId === appId);
          const maxTs = appObs.reduce(
            (max, o) => (o.timestamp > max ? o.timestamp : max),
            appObs[0].timestamp
          );
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

    // ── Update categories for ad/tracking apps ──
    for (const [baseDomain, webAppId] of Array.from(domainToWebAppId.entries())) {
      if (isAdTrackingDomain(baseDomain) && webAppId) {
        await prisma.webApp
          .update({
            where: { id: webAppId },
            data: { category: "ADVERTISING" },
          })
          .catch(() => {
            // Ignore if already set
          });
      }
    }

    // ── Run classification on affected apps ──
    for (const appId of Array.from(touchedWebAppIds)) {
      try {
        await classifyApp(appId);
        summary.classified++;
      } catch (err) {
        console.error(`Classification failed for app ${appId}:`, err);
      }
    }

    summary.studentsMatched = matchedStudentIds.size;

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Securly upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Securly CSV",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
