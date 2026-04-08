export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { QuickActions } from "@/components/review/quick-actions";
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.UNKNOWN}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function riskColor(score: number) {
  if (score > 60) return "text-red-600 font-semibold";
  if (score > 30) return "text-amber-600 font-semibold";
  return "text-green-600";
}

function collectsDataIcon(status: string) {
  if (status === "YES")
    return <CheckCircle className="h-4 w-4 text-red-500" />;
  if (status === "NO")
    return <XCircle className="h-4 w-4 text-green-500" />;
  return <HelpCircle className="h-4 w-4 text-slate-400" />;
}

export default async function ReviewPage() {
  const apps = await prisma.webApp.findMany({
    where: {
      approvalStatus: { in: ["PENDING_REVIEW", "UNKNOWN"] },
    },
    orderBy: { riskScore: "desc" },
    include: {
      vendor: true,
      _count: { select: { observations: true } },
    },
  });

  const highRiskCount = apps.filter((a) => a.riskScore > 60).length;
  const collectingDataCount = apps.filter(
    (a) => a.collectsData === "YES"
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Privacy Review Queue
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Applications pending privacy and compliance review, sorted by risk.
        </p>
      </div>

      {/* Confidence disclaimer */}
      <div className="mb-6">
        <ConfidenceDisclaimer
          level="medium"
          message="Risk scores and data collection assessments are probabilistic. Review each app's evidence before making approval decisions."
        />
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">
            Awaiting Review
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatNumber(apps.length)}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-600">High Risk</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {formatNumber(highRiskCount)}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-600">
            Collecting Data
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {formatNumber(collectingDataCount)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-600">App</th>
              <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
              <th className="px-4 py-3 font-medium text-slate-600">Risk</th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Collects Data
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Confidence
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Last Seen
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Obs.
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Quick Actions
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {apps.map((app) => (
              <tr
                key={app.id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/apps/${app.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {app.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {app.primaryDomain}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {app.vendor?.name ?? (
                    <span className="text-slate-400">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={riskColor(app.riskScore)}>
                    {Math.round(app.riskScore)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {collectsDataIcon(app.collectsData)}
                    <span className="text-xs text-slate-600">
                      {app.collectsData === "YES"
                        ? "Yes"
                        : app.collectsData === "NO"
                          ? "No"
                          : "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {Math.round(app.dataConfidence * 100)}%
                </td>
                <td className="px-4 py-3">
                  {statusBadge(app.approvalStatus)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {app.lastSeenAt
                    ? formatDistanceToNow(new Date(app.lastSeenAt), {
                        addSuffix: true,
                      })
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatNumber(app._count.observations)}
                </td>
                <td className="px-4 py-3">
                  <QuickActions appId={app.id} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/apps/${app.id}?from=review&action=review#review-section`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    Open Review
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length === 0 && (
          <div className="flex flex-col items-center py-12">
            <ShieldAlert className="h-8 w-8 text-green-400" />
            <p className="mt-2 text-sm text-slate-500">
              All apps have been reviewed. Nice work!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
