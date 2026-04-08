export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Database,
} from "lucide-react";
import { UploadForm } from "@/components/ingestion/upload-form";
import { ReclassifyButton } from "@/components/ingestion/reclassify-button";
import { ConfidenceDisclaimer } from "@/components/ui/confidence-disclaimer";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

const SOURCE_LABELS: Record<string, string> = {
  DNS_LOG: "DNS Log",
  BROWSER_TELEMETRY: "Browser Telemetry",
  SSO_LOG: "SSO Log",
  LMS_LAUNCH: "LMS Launch",
  MDM_INVENTORY: "MDM Inventory",
  CSV_UPLOAD: "CSV Upload",
  MANUAL_ENTRY: "Manual Entry",
  MOCK: "Mock / Test Data",
};

const ALL_SOURCES = [
  "DNS_LOG",
  "BROWSER_TELEMETRY",
  "SSO_LOG",
  "LMS_LAUNCH",
  "MDM_INVENTORY",
  "CSV_UPLOAD",
  "MANUAL_ENTRY",
  "MOCK",
];

export default async function IngestionPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get counts, latest observation per source type, and schools
  const [countsBySource, latestBySource, schools] = await Promise.all([
    prisma.observation.groupBy({
      by: ["sourceType"],
      _count: { id: true },
    }),
    Promise.all(
      ALL_SOURCES.map(async (source) => {
        const latest = await prisma.observation.findFirst({
          where: { sourceType: source as never },
          orderBy: { timestamp: "desc" },
          select: { timestamp: true, sourceType: true },
        });
        return { sourceType: source, latest };
      })
    ),
    prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const countsMap = new Map(
    countsBySource.map((c) => [c.sourceType, c._count.id])
  );
  const latestMap = new Map(
    latestBySource.map((l) => [l.sourceType, l.latest?.timestamp ?? null])
  );

  const sourceData = ALL_SOURCES.map((source) => {
    const count = countsMap.get(source as never) ?? 0;
    const lastTimestamp = latestMap.get(source) ?? null;

    let status: "active" | "stale" | "inactive" = "inactive";
    if (lastTimestamp) {
      if (lastTimestamp >= sevenDaysAgo) {
        status = "active";
      } else if (lastTimestamp >= thirtyDaysAgo) {
        status = "stale";
      }
    }

    return {
      sourceType: source,
      label: SOURCE_LABELS[source] ?? source,
      count,
      lastTimestamp,
      status,
    };
  });

  const totalObservations = sourceData.reduce((sum, s) => sum + s.count, 0);
  const activeSources = sourceData.filter((s) => s.status === "active").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Ingestion Status</h1>
        <p className="mt-1 text-sm text-slate-500">
          Data source connections and ingestion pipeline status.
        </p>
      </div>

      {/* Upload section */}
      <UploadForm schools={schools} />

      {/* Re-classify section */}
      <ReclassifyButton />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">Total Observations</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatNumber(totalObservations)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Data Sources</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {ALL_SOURCES.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Active Sources</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {activeSources}
          </p>
        </div>
      </div>

      {/* Source table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-600">Source</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Observations
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Last Observation
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sourceData.map((source) => (
              <tr
                key={source.sourceType}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {source.label}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatNumber(source.count)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {source.lastTimestamp
                    ? formatDistanceToNow(new Date(source.lastTimestamp), {
                        addSuffix: true,
                      })
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  {source.status === "active" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  )}
                  {source.status === "stale" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Stale
                    </span>
                  )}
                  {source.status === "inactive" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Informational note */}
      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Data sources feed into AppTrace from network-layer telemetry. iOS
          devices provide limited endpoint visibility — detection relies on DNS,
          SSO, and proxy signals.
        </p>
      </div>

      {/* Source-specific notes */}
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Source Capabilities &amp; Limitations
        </h3>
        <div className="space-y-2">
          <ConfidenceDisclaimer
            compact
            level="high"
            message="DNS Logs: Identifies which domains devices connect to. Cannot determine specific pages visited or data submitted. High coverage across all device types."
          />
          <ConfidenceDisclaimer
            compact
            level="high"
            message="SSO Logs: Confirms authenticated app access with user identity. Limited to apps integrated with district SSO. High confidence when available."
          />
          <ConfidenceDisclaimer
            compact
            level="medium"
            message="Browser Telemetry: Provides URL-level detail and page titles. Only available on managed browsers (Chrome on Chromebooks/Macs). Not available on iOS Safari."
          />
          <ConfidenceDisclaimer
            compact
            level="medium"
            message="LMS Launch: Confirms app usage initiated from the learning management system. Limited to LMS-integrated tools."
          />
          <ConfidenceDisclaimer
            compact
            level="medium"
            message="MDM Inventory: Lists installed apps on managed devices. Does not indicate actual usage frequency. Available for all managed device types."
          />
          <ConfidenceDisclaimer
            compact
            level="low"
            message="CSV Upload / Manual Entry: Data quality depends on the source. No automated validation. Treat as supplementary evidence."
          />
        </div>
      </div>
    </div>
  );
}
