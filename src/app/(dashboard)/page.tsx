export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  Globe,
  AlertTriangle,
  ShieldAlert,
  Users,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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

function categoryBadge(category: string) {
  const label = category.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {label}
    </span>
  );
}

function riskColor(score: number) {
  if (score > 60) return "text-red-600";
  if (score > 30) return "text-amber-600";
  return "text-green-600";
}

export default async function DashboardPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalApps,
    needsReviewCount,
    highRiskCount,
    activeStudentsResult,
    recentApps,
    topRiskApps,
    observationsBySource,
  ] = await Promise.all([
    prisma.webApp.count(),
    prisma.webApp.count({
      where: {
        approvalStatus: { in: ["PENDING_REVIEW", "UNKNOWN"] },
      },
    }),
    prisma.webApp.count({
      where: { riskScore: { gt: 60 } },
    }),
    prisma.observation.findMany({
      where: {
        timestamp: { gte: thirtyDaysAgo },
        studentId: { not: null },
      },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.webApp.findMany({
      take: 10,
      orderBy: { firstSeenAt: "desc" },
      include: { vendor: true },
    }),
    prisma.webApp.findMany({
      where: { riskScore: { gt: 30 } },
      take: 10,
      orderBy: { riskScore: "desc" },
      include: { vendor: true },
    }),
    prisma.observation.groupBy({
      by: ["sourceType"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const activeStudents = activeStudentsResult.length;

  const statCards = [
    {
      label: "Total Apps Discovered",
      value: totalApps,
      icon: Globe,
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Apps Needing Review",
      value: needsReviewCount,
      icon: AlertTriangle,
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "High Risk Apps",
      value: highRiskCount,
      icon: ShieldAlert,
      accent: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Active Students (30d)",
      value: activeStudents,
      icon: Users,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const maxObservations =
    observationsBySource.length > 0
      ? Math.max(...observationsBySource.map((o) => o._count.id))
      : 1;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of discovered applications and governance status.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatNumber(card.value)}
                  </p>
                </div>
                <div className={`rounded-lg ${card.bg} p-3`}>
                  <Icon className={`h-5 w-5 ${card.accent}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two columns */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Discoveries */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Discoveries
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {app.name}
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {app.primaryDomain}
                    </span>
                    {categoryBadge(app.category)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(app.approvalStatus)}
                  <span
                    className={`text-sm font-semibold ${riskColor(app.riskScore)}`}
                  >
                    {Math.round(app.riskScore)}
                  </span>
                </div>
              </Link>
            ))}
            {recentApps.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No apps discovered yet.
              </p>
            )}
          </div>
        </div>

        {/* Top Risk Apps */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Top Risk Apps
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topRiskApps.map((app) => {
              const barColor =
                app.riskScore > 60
                  ? "bg-red-500"
                  : app.riskScore > 30
                    ? "bg-amber-500"
                    : "bg-green-500";
              return (
                <Link
                  key={app.id}
                  href={`/apps/${app.id}`}
                  className="block px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-900">
                        {app.name}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {app.vendor?.name ?? "Unknown vendor"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(app.approvalStatus)}
                      <span
                        className={`w-8 text-right text-sm font-semibold ${riskColor(app.riskScore)}`}
                      >
                        {Math.round(app.riskScore)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{ width: `${Math.min(app.riskScore, 100)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
            {topRiskApps.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No high risk apps found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Observations by Source */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Observations by Source
          </h2>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {observationsBySource.map((source) => {
              const label = source.sourceType.replace(/_/g, " ");
              const pct = (source._count.id / maxObservations) * 100;
              return (
                <div key={source.sourceType}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {label}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatNumber(source._count.id)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {observationsBySource.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">
                No observations recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
