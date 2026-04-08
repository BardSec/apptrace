import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Search, Filter, CheckCircle, XCircle, HelpCircle } from "lucide-react";

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
  searchParams: { q?: string; category?: string; status?: string; risk?: string };
}) {
  const { q, category, status, risk } = searchParams;

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

  const apps = await prisma.webApp.findMany({
    where,
    orderBy: { riskScore: "desc" },
    include: {
      vendor: true,
      _count: { select: { observations: true } },
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Discovered Apps</h1>
        <p className="mt-1 text-sm text-slate-500">
          All applications discovered across your district network.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <form className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search apps or domains..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Category
            </label>
            <select
              name="category"
              defaultValue={category ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Risk Level
            </label>
            <select
              name="risk"
              defaultValue={risk ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Levels</option>
              <option value="high">High (&gt;60)</option>
              <option value="medium">Medium (30-60)</option>
              <option value="low">Low (&lt;30)</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          {(q || category || status || risk) && (
            <Link
              href="/apps"
              className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Results count */}
      <p className="mb-3 text-sm text-slate-500">
        {formatNumber(apps.length)} app{apps.length !== 1 ? "s" : ""} found
      </p>

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
