export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { AppFilters } from "@/components/apps/app-filters";

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
    PENDING_REVIEW: "Pending",
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

function categoryBadge(category: string) {
  const label = category.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {label}
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

const CATEGORIES = [
  "LMS",
  "ASSESSMENT",
  "COMMUNICATION",
  "PRODUCTIVITY",
  "CREATIVE",
  "REFERENCE",
  "SOCIAL_MEDIA",
  "VIDEO",
  "GAMING",
  "UTILITY",
  "SSO_IDP",
  "CDN_INFRASTRUCTURE",
  "ANALYTICS",
  "ADVERTISING",
  "UNKNOWN",
];

const STATUSES = [
  "APPROVED",
  "PENDING_REVIEW",
  "RESTRICTED",
  "BLOCKED",
  "UNKNOWN",
];

export default async function AppsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    status?: string;
    risk?: string;
    lastSeen?: string;
    vendor?: string;
    collectsData?: string;
    sort?: string;
  };
}) {
  const { q, category, status, risk, lastSeen, vendor, collectsData, sort } =
    searchParams;

  const where: Prisma.WebAppWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { primaryDomain: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category && CATEGORIES.includes(category)) {
    where.category = category as Prisma.EnumAppCategoryFilter;
  }

  if (status && STATUSES.includes(status)) {
    where.approvalStatus = status as Prisma.EnumApprovalStatusFilter;
  }

  if (risk === "high") {
    where.riskScore = { gt: 60 };
  } else if (risk === "medium") {
    where.riskScore = { gt: 30, lte: 60 };
  } else if (risk === "low") {
    where.riskScore = { lte: 30 };
  }

  // Last seen filter
  if (lastSeen && lastSeen !== "all") {
    const now = new Date();
    let daysAgo = 90;
    if (lastSeen === "7d") daysAgo = 7;
    else if (lastSeen === "30d") daysAgo = 30;
    else if (lastSeen === "90d") daysAgo = 90;
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    where.lastSeenAt = { gte: cutoff };
  }

  // Vendor filter
  if (vendor) {
    where.vendorId = vendor;
  }

  // Collects data filter
  if (
    collectsData &&
    ["YES", "NO", "UNKNOWN"].includes(collectsData)
  ) {
    where.collectsData =
      collectsData as Prisma.EnumDataCollectionLikelihoodFilter;
  }

  // Sort
  let orderBy: Prisma.WebAppOrderByWithRelationInput;
  switch (sort) {
    case "name":
      orderBy = { name: "asc" };
      break;
    case "lastSeen":
      orderBy = { lastSeenAt: "desc" };
      break;
    case "observations":
      orderBy = { totalObservations: "desc" };
      break;
    case "confidence":
      orderBy = { dataConfidence: "desc" };
      break;
    case "risk":
    default:
      orderBy = { riskScore: "desc" };
      break;
  }

  const [apps, totalCount, vendors] = await Promise.all([
    prisma.webApp.findMany({
      where,
      orderBy,
      include: {
        vendor: true,
        _count: { select: { observations: true } },
      },
    }),
    prisma.webApp.count(),
    prisma.vendor.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Discovered Apps</h1>
        <p className="mt-1 text-sm text-slate-500">
          All applications discovered across your district network.
        </p>
      </div>

      {/* Filters */}
      <AppFilters
        vendors={vendors}
        totalCount={totalCount}
        filteredCount={apps.length}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-600">App</th>
              <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
              <th className="px-4 py-3 font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Risk</th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Collects Data
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Confidence
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Last Seen
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Obs.
              </th>
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
                <td className="px-4 py-3">{categoryBadge(app.category)}</td>
                <td className="px-4 py-3">
                  {statusBadge(app.approvalStatus)}
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
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            No apps match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
