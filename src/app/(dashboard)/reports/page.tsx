export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Minus, Download } from "lucide-react";
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

function complianceBadge(value: boolean | null, label: string) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      <Minus className="h-3 w-3" />
      {label}
    </span>
  );
}

function ExportButton({ type, label }: { type: string; label: string }) {
  return (
    <a
      href={`/api/reports/export?type=${type}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default async function ReportsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Grade band mapping: K, 1, 2 => K-2; 3, 4, 5 => 3-5; 6, 7, 8 => 6-8; 9, 10, 11, 12 => 9-12
  const gradeLevels = await prisma.gradeLevel.findMany({
    include: {
      students: {
        include: {
          student: {
            include: {
              observations: {
                where: { webAppId: { not: null } },
                select: { webAppId: true },
                distinct: ["webAppId"],
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Build grade band data
  const gradeBands: Record<string, Set<string>> = {
    "K-2": new Set(),
    "3-5": new Set(),
    "6-8": new Set(),
    "9-12": new Set(),
  };

  for (const gl of gradeLevels) {
    let band = "9-12";
    const name = gl.name.toLowerCase();
    if (
      name === "k" ||
      name === "kindergarten" ||
      name === "1" ||
      name === "1st" ||
      name === "2" ||
      name === "2nd"
    ) {
      band = "K-2";
    } else if (name === "3" || name === "3rd" || name === "4" || name === "4th" || name === "5" || name === "5th") {
      band = "3-5";
    } else if (name === "6" || name === "6th" || name === "7" || name === "7th" || name === "8" || name === "8th") {
      band = "6-8";
    }

    for (const sgl of gl.students) {
      for (const obs of sgl.student.observations) {
        if (obs.webAppId) {
          gradeBands[band].add(obs.webAppId);
        }
      }
    }
  }

  const gradeBandData = Object.entries(gradeBands).map(([band, appIds]) => ({
    band,
    count: appIds.size,
  }));

  // Unreviewed apps collecting data
  const unreviewedCollecting = await prisma.webApp.findMany({
    where: {
      collectsData: "YES",
      approvalStatus: { in: ["UNKNOWN", "PENDING_REVIEW"] },
    },
    orderBy: { riskScore: "desc" },
    include: { vendor: true },
    take: 20,
  });

  // Top 10 most active apps (by observation count in last 30 days)
  const recentObservations = await prisma.observation.groupBy({
    by: ["webAppId"],
    where: {
      timestamp: { gte: thirtyDaysAgo },
      webAppId: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const activeAppIds = recentObservations
    .map((o) => o.webAppId)
    .filter((id): id is string => id !== null);

  const activeApps = await prisma.webApp.findMany({
    where: { id: { in: activeAppIds } },
    include: { vendor: true },
  });

  const activeAppsMap = new Map(activeApps.map((a) => [a.id, a]));

  const topActiveApps = recentObservations
    .map((obs) => ({
      app: activeAppsMap.get(obs.webAppId!),
      recentCount: obs._count.id,
    }))
    .filter((item) => item.app != null);

  // Vendor summary
  const vendors = await prisma.vendor.findMany({
    include: {
      webApps: {
        select: {
          id: true,
          totalObservations: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const vendorSummary = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    appCount: v.webApps.length,
    totalObservations: v.webApps.reduce(
      (sum, app) => sum + app.totalObservations,
      0
    ),
    coppaCompliant: v.coppaCompliant,
    ferpaCompliant: v.ferpaCompliant,
  }));

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance reports and data governance analytics.
          </p>
        </div>
        <ExportButton type="all-apps" label="Export All Apps" />
      </div>

      {/* Confidence disclaimer */}
      <div className="mb-6">
        <ConfidenceDisclaimer
          level="medium"
          message="Reports reflect aggregated telemetry from network-layer sources. Detection coverage varies by device type — iOS devices have more limited visibility than managed Macs."
        />
      </div>

      <div className="space-y-6">
        {/* Apps by Grade Band */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Apps by Grade Band
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Count of distinct apps observed per grade level group.
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {gradeBandData.map((item) => (
                <div
                  key={item.band}
                  className="rounded-lg border border-slate-200 p-4 text-center"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {item.band}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-indigo-600">
                    {item.count}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">apps</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unreviewed Apps Collecting Data */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Unreviewed Apps Collecting Data
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Apps marked as collecting data but not yet reviewed or approved.
              </p>
            </div>
            <ExportButton type="needs-review" label="Export CSV" />
          </div>
          {unreviewedCollecting.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-medium text-slate-600">
                      App
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Vendor
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Risk
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Confidence
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unreviewedCollecting.map((app) => (
                    <tr
                      key={app.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <a
                          href={`/apps/${app.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {app.name}
                        </a>
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
                        <span
                          className={
                            app.riskScore > 60
                              ? "font-semibold text-red-600"
                              : app.riskScore > 30
                                ? "font-semibold text-amber-600"
                                : "text-green-600"
                          }
                        >
                          {Math.round(app.riskScore)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {Math.round(app.dataConfidence * 100)}%
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(app.approvalStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No unreviewed apps currently flagged as collecting data.
            </p>
          )}
        </div>

        {/* Top 10 Most Active Apps */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Top 10 Most Active Apps
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                By observation count in the last 30 days.
              </p>
            </div>
          </div>
          {topActiveApps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-medium text-slate-600">
                      #
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      App
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Vendor
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Observations (30d)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topActiveApps.map((item, idx) => (
                    <tr
                      key={item.app!.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/apps/${item.app!.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {item.app!.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.app!.vendor?.name ?? (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(item.app!.approvalStatus)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatNumber(item.recentCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No observations in the last 30 days.
            </p>
          )}
        </div>

        {/* High Risk Apps */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                High Risk Apps
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Apps with a risk score above 60.
              </p>
            </div>
            <ExportButton type="high-risk" label="Export CSV" />
          </div>
        </div>

        {/* Vendor Summary */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Vendor Summary
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Vendor name, app count, total observations, and compliance status.
              </p>
            </div>
            <ExportButton type="vendor-summary" label="Export CSV" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Apps
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Observations
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorSummary.map((v) => (
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {v.name}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {v.appCount}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatNumber(v.totalObservations)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {complianceBadge(v.coppaCompliant, "COPPA")}
                        {complianceBadge(v.ferpaCompliant, "FERPA")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendorSummary.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No vendors found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
