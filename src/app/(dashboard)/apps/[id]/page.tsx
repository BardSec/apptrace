export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
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
} from "lucide-react";
import { AppActions } from "@/components/apps/app-actions";

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

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            Based on DNS and SSO activity. Browser-level confirmation limited on
            iOS. Detection relies on DNS, SSO, and proxy signals.
          </p>
        </div>
      </div>
    </div>
  );
}
