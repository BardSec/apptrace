import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  matchDomain,
  createUnknownApp,
  clearDomainCache,
} from "@/services/normalization";
import { classifyApp } from "@/services/classification";
import {
  parsePaloAltoCsv,
  APP_ID_MAP,
  SCHOOL_CODE_MAP,
  mapPanSubcategory,
  type PaloAltoRow,
} from "@/services/ingestion/adapters/paloalto";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB — PAN-OS exports can be very large

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 100MB limit" },
        { status: 400 }
      );
    }

    const text = await file.text();

    let rows: PaloAltoRow[];
    try {
      rows = parsePaloAltoCsv(text);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Failed to parse Palo Alto CSV",
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in file (all rows may have been filtered as infrastructure noise)" },
        { status: 400 }
      );
    }

    // ── Summary tracking ──
    const summary = {
      totalRows: rows.length,
      imported: 0,
      skippedNoise: 0,
      appsMatched: 0,
      newApps: 0,
      usersMatched: 0,
      classified: 0,
      errors: 0,
      topApplications: [] as { application: string; name: string; count: number }[],
      actionBreakdown: { allow: 0, deny: 0, drop: 0 },
    };

    // Count action breakdown
    for (const row of rows) {
      summary.actionBreakdown[row.action]++;
    }

    // Count App-ID frequency for top applications
    const appCounts = new Map<string, number>();
    for (const row of rows) {
      appCounts.set(row.application, (appCounts.get(row.application) || 0) + 1);
    }
    summary.topApplications = Array.from(appCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([application, count]) => {
        const mapped = APP_ID_MAP[application];
        return {
          application,
          name: mapped?.name ?? application,
          count,
        };
      });

    // ── Caches ──
    clearDomainCache();
    const appIdToWebAppId = new Map<string, string>();
    const userCache = new Map<string, string | null>();
    const schoolCodeCache = new Map<string, string | null>();
    const touchedWebAppIds = new Set<string>();
    const matchedUserIds = new Set<string>();

    // Pre-load all schools for code matching
    const allSchools = await prisma.school.findMany({
      select: { id: true, name: true },
    });

    const findSchoolByCode = (code: string): string | null => {
      const keyword = SCHOOL_CODE_MAP[code];
      if (!keyword) return null;
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
        sessionDurationSec: number | null;
        rawData: Record<string, unknown>;
      }> = [];

      for (const row of chunk) {
        try {
          // ── Resolve WebApp from App-ID ──
          let webAppId: string | null = null;
          const mapped = APP_ID_MAP[row.application];
          const domain = mapped?.domain ?? row.application;

          if (appIdToWebAppId.has(row.application)) {
            webAppId = appIdToWebAppId.get(row.application) ?? null;
          } else {
            if (mapped) {
              // Try to match via the mapped domain
              webAppId = await matchDomain(mapped.domain);
              if (!webAppId) {
                // Create app with the known metadata
                const now = new Date();
                const app = await prisma.webApp.create({
                  data: {
                    name: mapped.name,
                    primaryDomain: mapped.domain,
                    category: mapped.category,
                    approvalStatus: "UNKNOWN",
                    firstSeenAt: now,
                    lastSeenAt: now,
                    domainAliases: {
                      create: {
                        domain: mapped.domain,
                        isPrimary: true,
                        isCanonical: true,
                        domainType: "UNKNOWN",
                      },
                    },
                  },
                }).catch(async () => {
                  // Unique constraint: app already exists, find it
                  const existing = await prisma.webApp.findFirst({
                    where: { name: mapped.name },
                    select: { id: true },
                  });
                  return existing;
                });
                webAppId = app?.id ?? null;
                if (webAppId) summary.newApps++;
              } else {
                summary.appsMatched++;
              }
            } else {
              // Unknown App-ID: try matchDomain with the App-ID as a pseudo-domain
              webAppId = await matchDomain(row.application);
              if (!webAppId) {
                // Create an unknown app for this App-ID
                const now = new Date();
                const category = mapPanSubcategory(row.appSubcategory);
                const appName = row.application
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
                const app = await prisma.webApp.create({
                  data: {
                    name: `${appName} (PAN-OS)`,
                    primaryDomain: row.application,
                    category,
                    approvalStatus: "UNKNOWN",
                    firstSeenAt: now,
                    lastSeenAt: now,
                    domainAliases: {
                      create: {
                        domain: row.application,
                        isPrimary: true,
                        isCanonical: true,
                        domainType: "UNKNOWN",
                      },
                    },
                  },
                }).catch(async () => {
                  const existing = await prisma.webApp.findFirst({
                    where: { primaryDomain: row.application },
                    select: { id: true },
                  });
                  return existing;
                });
                webAppId = app?.id ?? null;
                if (webAppId) summary.newApps++;
              } else {
                summary.appsMatched++;
              }
            }
            if (webAppId) {
              appIdToWebAppId.set(row.application, webAppId);
            }
          }

          if (webAppId) {
            touchedWebAppIds.add(webAppId);
          }

          // ── Resolve student from source user ──
          let studentId: string | null = null;
          if (row.sourceUser) {
            if (userCache.has(row.sourceUser)) {
              studentId = userCache.get(row.sourceUser) ?? null;
            } else {
              // Try matching by districtStudentId first
              const student = await prisma.student.findFirst({
                where: {
                  OR: [
                    { districtStudentId: row.sourceUser },
                    {
                      email: {
                        startsWith: row.sourceUser,
                      },
                    },
                  ],
                },
                select: { id: true },
              });
              studentId = student?.id ?? null;
              userCache.set(row.sourceUser, studentId);
            }
            if (studentId) {
              matchedUserIds.add(studentId);
            }
          }

          // ── Resolve school from rule school code ──
          let schoolId: string | null = null;
          if (row.schoolCode) {
            if (schoolCodeCache.has(row.schoolCode)) {
              schoolId = schoolCodeCache.get(row.schoolCode) ?? null;
            } else {
              schoolId = findSchoolByCode(row.schoolCode);
              schoolCodeCache.set(row.schoolCode, schoolId);
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
            domain,
            fullUrl: null,
            sourceType: "DNS_LOG",
            schoolId,
            webAppId,
            studentId,
            sessionDurationSec: row.elapsedTime > 0 ? row.elapsedTime : null,
            rawData: {
              source: "paloalto",
              appId: row.application,
              sourceIp: row.sourceIp,
              destinationIp: row.destinationIp,
              rule: row.rule,
              action: row.action,
              destinationPort: row.destinationPort,
              protocol: row.protocol,
              bytes: row.bytes,
              bytesSent: row.bytesSent,
              bytesReceived: row.bytesReceived,
              elapsedTime: row.elapsedTime,
              appCategory: row.appCategory,
              appSubcategory: row.appSubcategory,
              appRisk: row.appRisk,
              isSaas: row.isSaas,
              isTunneled: row.isTunneled,
              schoolCode: row.schoolCode,
              sourceUser: row.sourceUser,
            },
          });

          summary.imported++;
        } catch (err) {
          console.error("Error processing Palo Alto row:", err);
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

    // ── Run classification on affected apps ──
    for (const appId of Array.from(touchedWebAppIds)) {
      try {
        await classifyApp(appId);
        summary.classified++;
      } catch (err) {
        console.error(`Classification failed for app ${appId}:`, err);
      }
    }

    summary.usersMatched = matchedUserIds.size;

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Palo Alto upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Palo Alto traffic log CSV",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
