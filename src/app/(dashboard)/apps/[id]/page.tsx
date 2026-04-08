export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatDistanceToNow,
  format,
  startOfWeek,
  startOfMonth,
  differenceInDays,
} from "date-fns";
import {
  ArrowLeft,
  Eye,
  Users,
  School,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
  Info,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { AppActions } from "@/components/apps/app-actions";
import { ConfidenceDisclaimer } from "@/components/ui/confidence-disclaimer";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING_REVIEW: "bg-amber-100 text-amber-700",
    RESTRICTED: "bg-orange-100 text-orange-700",
    BLOCKED: "bg-red-100 text-red-700",
    UNKNOWN: "bg-slate-100 text-slate-600",
  };
  const labels: Record<string, string> = {
    APPROVED: "Approved",
    PENDING_REVIEW: "Pending Review",
    RESTRICTED: "Restricted",
    BLOCKED: "Blocked",
    UNKNOWN: "Unknown",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] ?? colors.UNKNOWN}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function categoryBadge(category: string) {
  const label = category.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
      {label}
    </span>
  );
}

function domainTypeBadge(type: string) {
  const colors: Record<string, string> = {
    APP: "bg-blue-100 text-blue-700",
    LOGIN: "bg-purple-100 text-purple-700",
    CDN: "bg-slate-100 text-slate-600",
    STATIC: "bg-slate-100 text-slate-600",
    API: "bg-cyan-100 text-cyan-700",
    TRACKING: "bg-red-100 text-red-700",
    UNKNOWN: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] ?? colors.UNKNOWN}`}
    >
      {type}
    </span>
  );
}

function riskGauge(score: number) {
  const color =
    score > 60
      ? "text-red-600 border-red-200 bg-red-50"
      : score > 30
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : "text-green-600 border-green-200 bg-green-50";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${color}`}
    >
      <span className="text-lg font-bold">{Math.round(score)}</span>
      <span className="text-xs font-medium">/ 100</span>
    </div>
  );
}

function getConfidenceLevel(
  confidence: number
): "high" | "medium" | "low" {
  if (confidence > 0.8) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

function getGradeBand(gradeName: string): string {
  const name = gradeName.toLowerCase().trim();
  if (
    name === "k" ||
    name === "kindergarten" ||
    name === "1" ||
    name === "1st" ||
    name === "2" ||
    name === "2nd"
  ) {
    return "K-2";
  }
  if (
    name === "3" ||
    name === "3rd" ||
    name === "4" ||
    name === "4th" ||
    name === "5" ||
    name === "5th"
  ) {
    return "3-5";
  }
  if (
    name === "6" ||
    name === "6th" ||
    name === "7" ||
    name === "7th" ||
    name === "8" ||
    name === "8th"
  ) {
    return "6-8";
  }
  return "9-12";
}

export default async function AppDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const app = await prisma.webApp.findUnique({
    where: { id: params.id },
    include: {
      vendor: true,
      domainAliases: { orderBy: { isPrimary: "desc" } },
      dataCollectionSignals: { orderBy: { detectedAt: "desc" } },
      privacyReviews: { orderBy: { reviewedAt: "desc" } },
      evidenceArtifacts: { orderBy: { capturedAt: "desc" } },
      dataCategories: { orderBy: { confidence: "desc" } },
    },
  });

  if (!app) {
    notFound();
  }

  const [
    totalObservations,
    uniqueStudents,
    schoolsSeenIn,
    observationsBySchool,
    observationsBySource,
  ] = await Promise.all([
    prisma.observation.count({ where: { webAppId: app.id } }),
    prisma.observation.findMany({
      where: { webAppId: app.id, studentId: { not: null } },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.observation.findMany({
      where: { webAppId: app.id, schoolId: { not: null } },
      select: { schoolId: true },
      distinct: ["schoolId"],
    }),
    prisma.observation.groupBy({
      by: ["schoolId"],
      where: { webAppId: app.id, schoolId: { not: null } },
      _count: { id: true },
    }),
    prisma.observation.groupBy({
      by: ["sourceType"],
      where: { webAppId: app.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Fetch school names for the groupBy results
  const schoolIds = observationsBySchool
    .map((o) => o.schoolId)
    .filter((id): id is string => id !== null);
  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, name: true },
  });
  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  // ── Usage by School (aggregate) ──
  const schoolUsageData = await Promise.all(
    schoolIds.map(async (schoolId) => {
      const [studentCount, deviceCount, obsCount, lastObs] = await Promise.all([
        prisma.observation.findMany({
          where: { webAppId: app.id, schoolId, studentId: { not: null } },
          select: { studentId: true },
          distinct: ["studentId"],
        }),
        prisma.observation.findMany({
          where: { webAppId: app.id, schoolId, deviceId: { not: null } },
          select: { deviceId: true },
          distinct: ["deviceId"],
        }),
        prisma.observation.count({ where: { webAppId: app.id, schoolId } }),
        prisma.observation.findFirst({
          where: { webAppId: app.id, schoolId },
          orderBy: { timestamp: "desc" },
          select: { timestamp: true },
        }),
      ]);
      return {
        schoolId,
        schoolName: schoolMap.get(schoolId) ?? "Unknown School",
        studentCount: studentCount.length,
        deviceCount: deviceCount.length,
        observationCount: obsCount,
        lastSeen: lastObs?.timestamp ?? null,
      };
    })
  );

  // ── Usage by Grade Band (aggregate) ──
  // Get students who have observations for this app
  const studentObservations = await prisma.observation.findMany({
    where: { webAppId: app.id, studentId: { not: null } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const studentIds = studentObservations
    .map((o) => o.studentId)
    .filter((id): id is string => id !== null);

  // Get grade levels for these students
  const studentGradeLevels = await prisma.studentGradeLevel.findMany({
    where: { studentId: { in: studentIds } },
    include: { gradeLevel: true },
  });

  // Group by grade band
  const gradeBandMap: Record<
    string,
    { students: Set<string>; observations: number }
  > = {
    "K-2": { students: new Set(), observations: 0 },
    "3-5": { students: new Set(), observations: 0 },
    "6-8": { students: new Set(), observations: 0 },
    "9-12": { students: new Set(), observations: 0 },
  };

  const studentToBands = new Map<string, string[]>();
  for (const sgl of studentGradeLevels) {
    const band = getGradeBand(sgl.gradeLevel.name);
    gradeBandMap[band].students.add(sgl.studentId);
    const existing = studentToBands.get(sgl.studentId) ?? [];
    existing.push(band);
    studentToBands.set(sgl.studentId, existing);
  }

  // Count observations per grade band
  const studentObsCounts = await prisma.observation.groupBy({
    by: ["studentId"],
    where: { webAppId: app.id, studentId: { in: studentIds } },
    _count: { id: true },
  });

  for (const soc of studentObsCounts) {
    if (!soc.studentId) continue;
    const bands = studentToBands.get(soc.studentId) ?? [];
    for (const band of bands) {
      if (gradeBandMap[band]) {
        gradeBandMap[band].observations += soc._count.id;
      }
    }
  }

  const gradeBandData = Object.entries(gradeBandMap)
    .map(([band, data]) => ({
      band,
      studentCount: data.students.size,
      observationCount: data.observations,
    }))
    .filter((d) => d.studentCount > 0 || d.observationCount > 0);

  // ── Observation Timeline ──
  const allObservations = await prisma.observation.findMany({
    where: { webAppId: app.id },
    select: { timestamp: true },
    orderBy: { timestamp: "asc" },
  });

  let timelineData: { label: string; count: number }[] = [];
  if (allObservations.length > 0) {
    const firstDate = new Date(allObservations[0].timestamp);
    const lastDate = new Date(
      allObservations[allObservations.length - 1].timestamp
    );
    const daySpan = differenceInDays(lastDate, firstDate);

    if (daySpan > 90) {
      // Group by month
      const monthBuckets = new Map<string, number>();
      for (const obs of allObservations) {
        const d = new Date(obs.timestamp);
        const key = format(startOfMonth(d), "yyyy-MM");
        monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
      }
      timelineData = Array.from(monthBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({
          label: format(new Date(key + "-01"), "MMMM yyyy"),
          count,
        }));
    } else {
      // Group by week
      const weekBuckets = new Map<string, number>();
      for (const obs of allObservations) {
        const d = new Date(obs.timestamp);
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const key = format(weekStart, "yyyy-MM-dd");
        weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + 1);
      }
      timelineData = Array.from(weekBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({
          label: `Week of ${format(new Date(key), "MMM d")}`,
          count,
        }));
    }
  }

  const maxTimelineCount =
    timelineData.length > 0
      ? Math.max(...timelineData.map((d) => d.count))
      : 1;

  // Determine confidence level and sources for disclaimer
  const confidenceLevel = getConfidenceLevel(app.dataConfidence);
  const sourceTypes = observationsBySource.map((s) =>
    s.sourceType.replace(/_/g, " ")
  );

  return (
    <div className="p-6">
      {/* Back link */}
      <Link
        href="/apps"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Discovered Apps
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{app.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {app.vendor && (
                <span className="text-sm text-slate-600">
                  by {app.vendor.name}
                </span>
              )}
              <span className="text-sm text-slate-400">
                {app.primaryDomain}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {categoryBadge(app.category)}
            </div>
            {app.description && (
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                {app.description}
              </p>
            )}
          </div>
          <div>{riskGauge(app.riskScore)}</div>
        </div>

        {/* Action bar */}
        <div className="mt-5 border-t border-slate-200 pt-5">
          <AppActions appId={app.id} currentStatus={app.approvalStatus} />
        </div>
      </div>

      {/* Overview stats */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Total Observations</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatNumber(totalObservations)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Unique Students</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatNumber(uniqueStudents.length)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <School className="h-4 w-4" />
              <span className="text-xs font-medium">Schools Seen In</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatNumber(schoolsSeenIn.length)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">First / Last Seen</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {app.firstSeenAt
                ? format(new Date(app.firstSeenAt), "MMM d, yyyy")
                : "N/A"}
            </p>
            <p className="text-xs text-slate-500">
              {app.lastSeenAt
                ? formatDistanceToNow(new Date(app.lastSeenAt), {
                    addSuffix: true,
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Confidence disclaimer */}
        <div className="mt-4">
          <ConfidenceDisclaimer
            level={confidenceLevel}
            sources={sourceTypes}
          />
        </div>

        {/* Data collection assessment */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Data Collection Assessment
          </h3>
          <div className="flex items-center gap-3">
            {app.collectsData === "YES" ? (
              <CheckCircle className="h-5 w-5 text-red-500" />
            ) : app.collectsData === "NO" ? (
              <XCircle className="h-5 w-5 text-green-500" />
            ) : (
              <HelpCircle className="h-5 w-5 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-800">
              Likely collects student data:{" "}
              <span
                className={
                  app.collectsData === "YES"
                    ? "text-red-600"
                    : app.collectsData === "NO"
                      ? "text-green-600"
                      : "text-slate-500"
                }
              >
                {app.collectsData === "YES"
                  ? "YES"
                  : app.collectsData === "NO"
                    ? "NO"
                    : "UNKNOWN"}
              </span>
            </span>
            <span className="text-sm text-slate-500">
              ({Math.round(app.dataConfidence * 100)}% confidence)
            </span>
          </div>

          {app.dataCategories.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium uppercase text-slate-500">
                Data Categories
              </h4>
              {app.dataCategories.map((dc) => (
                <div key={dc.dataCategory} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-slate-700">
                    {dc.dataCategory.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${dc.confidence * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs text-slate-500">
                    {Math.round(dc.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Evidence & Signals */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Evidence &amp; Signals
        </h2>

        {app.dataCollectionSignals.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Signal Type
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Confidence
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Evidence
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Source
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Detected
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {app.dataCollectionSignals.map((signal) => (
                  <tr key={signal.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {signal.signalType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500"
                            style={{
                              width: `${signal.confidence * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {Math.round(signal.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {signal.evidence}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {signal.sourceType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(signal.detectedAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No data collection signals detected for this app.
          </p>
        )}

        {app.evidenceArtifacts.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Evidence Artifacts
              </h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Description
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Link
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Captured
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {app.evidenceArtifacts.map((artifact) => (
                  <tr key={artifact.id}>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {artifact.artifactType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {artifact.title}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {artifact.description ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {artifact.url ? (
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(
                        new Date(artifact.capturedAt),
                        "MMM d, yyyy"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Domain Aliases */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Domain Aliases
        </h2>
        {app.domainAliases.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Domain
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Primary
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Canonical
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {app.domainAliases.map((alias) => (
                  <tr key={alias.id}>
                    <td className="px-4 py-3 font-mono text-sm text-slate-800">
                      {alias.domain}
                    </td>
                    <td className="px-4 py-3">
                      {domainTypeBadge(alias.domainType)}
                    </td>
                    <td className="px-4 py-3">
                      {alias.isPrimary ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {alias.isCanonical ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(alias.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No domain aliases registered.
          </p>
        )}
      </div>

      {/* Privacy Reviews */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Privacy Reviews
        </h2>
        {app.privacyReviews.length > 0 ? (
          <div className="space-y-3">
            {app.privacyReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {review.reviewerName}
                    </span>
                    {statusBadge(review.status)}
                  </div>
                  <span className="text-sm text-slate-500">
                    {format(new Date(review.reviewedAt), "MMM d, yyyy")}
                  </span>
                </div>
                {review.riskAssessment && (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Risk Assessment:</span>{" "}
                    {review.riskAssessment}
                  </p>
                )}
                {review.notes && (
                  <p className="mt-1 text-sm text-slate-600">{review.notes}</p>
                )}
                {review.recommendedAction && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Recommended:</span>{" "}
                    {review.recommendedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No privacy reviews have been conducted for this app.
          </p>
        )}
      </div>

      {/* Observation Activity */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Observation Activity
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* By School */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                By School
              </h3>
            </div>
            {observationsBySchool.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {observationsBySchool.map((obs) => (
                  <div
                    key={obs.schoolId}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <span className="text-sm text-slate-700">
                      {schoolMap.get(obs.schoolId!) ?? "Unknown School"}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {formatNumber(obs._count.id)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No school-level data available.
              </p>
            )}
          </div>

          {/* By Source Type */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                By Source Type
              </h3>
            </div>
            {observationsBySource.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {observationsBySource.map((obs) => (
                  <div
                    key={obs.sourceType}
                    className="flex items-center justify-between px-5 py-2.5"
                  >
                    <span className="text-sm text-slate-700">
                      {obs.sourceType.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {formatNumber(obs._count.id)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No source-level data available.
              </p>
            )}
          </div>
        </div>

        <div className="mt-3">
          <ConfidenceDisclaimer
            compact
            level="medium"
            message={`Observation data sourced from ${sourceTypes.length > 0 ? sourceTypes.join(", ") : "network telemetry"}. Full URL-level detail is not available from DNS logs. Per-app activity on iOS is inferred, not directly observed.`}
          />
        </div>
      </div>

      {/* Usage by School (aggregate) */}
      <div className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <School className="h-5 w-5 text-slate-600" />
          Usage by School
        </h2>
        {schoolUsageData.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    School Name
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Students
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Devices
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Observations
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schoolUsageData.map((row) => (
                  <tr
                    key={row.schoolId}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.schoolName}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(row.studentCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(row.deviceCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(row.observationCount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.lastSeen
                        ? formatDistanceToNow(new Date(row.lastSeen), {
                            addSuffix: true,
                          })
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No school-level usage data available.
          </p>
        )}
      </div>

      {/* Usage by Grade Band (aggregate) */}
      <div className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <GraduationCap className="h-5 w-5 text-slate-600" />
          Usage by Grade Band
        </h2>
        {gradeBandData.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Grade Band
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Students
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Observations
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeBandData.map((row) => (
                    <tr
                      key={row.band}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.band}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatNumber(row.studentCount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatNumber(row.observationCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <ConfidenceDisclaimer
                compact
                level="medium"
                message="Grade-level data derived from student enrollment records linked to network observations."
              />
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No grade-level data available for this app.
          </p>
        )}
      </div>

      {/* Observation Timeline */}
      <div className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BarChart3 className="h-5 w-5 text-slate-600" />
          Observation Timeline
        </h2>
        {timelineData.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="space-y-2">
              {timelineData.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-36 flex-shrink-0 text-right text-xs text-slate-500">
                    {row.label}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded bg-indigo-500 transition-all"
                      style={{
                        width: `${Math.max(
                          (row.count / maxTimelineCount) * 100,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-slate-700">
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            No observation timeline data available.
          </p>
        )}
      </div>
    </div>
  );
}
