"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  FileUp,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

type PaloAltoResult = {
  totalRows: number;
  imported: number;
  skippedNoise: number;
  appsMatched: number;
  newApps: number;
  usersMatched: number;
  classified: number;
  errors: number;
  topApplications: { application: string; name: string; count: number }[];
  actionBreakdown: { allow: number; deny: number; drop: number };
};

export function PaloAltoUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<PaloAltoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingestion/paloalto", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setResult(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function formatNumber(n: number) {
    return new Intl.NumberFormat("en-US").format(n);
  }

  const totalActions = result
    ? result.actionBreakdown.allow +
      result.actionBreakdown.deny +
      result.actionBreakdown.drop
    : 0;

  return (
    <div className="mb-6 rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6">
      <div className="mb-1 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
          <Shield className="h-4.5 w-4.5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Import Palo Alto Traffic Logs
        </h2>
      </div>
      <p className="mb-4 ml-10.5 text-sm text-slate-500">
        Upload CSV export from Monitor &rarr; Logs &rarr; Traffic
      </p>

      <div className="flex items-end gap-4">
        {/* File input */}
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            PAN-OS Traffic Log CSV
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-200"
          />
          {file && (
            <p className="mt-1 text-xs text-slate-500">
              {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Import Traffic Data
            </>
          )}
        </button>
      </div>

      {/* Note about App-ID */}
      <p className="mt-3 text-xs text-slate-400">
        PAN-OS App-ID identifies applications by traffic signature. No URL
        filtering subscription required. Infrastructure noise (DNS, NTP, OCSP,
        etc.) is automatically filtered.
      </p>

      {/* Error display */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="mt-5 space-y-4">
          {/* Success header */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800">
              Import Complete
            </span>
          </div>

          {/* Primary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-xs font-medium text-slate-500">Total Rows</p>
              <p className="text-xl font-bold text-slate-900">
                {formatNumber(result.totalRows)}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
              <p className="text-xs font-medium text-green-600">Imported</p>
              <p className="text-xl font-bold text-green-800">
                {formatNumber(result.imported)}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <p className="text-xs font-medium text-blue-600">
                Apps Matched
              </p>
              <p className="text-xl font-bold text-blue-800">
                {formatNumber(result.appsMatched)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-600">
                New Apps Discovered
              </p>
              <p className="text-xl font-bold text-amber-700">
                {formatNumber(result.newApps)}
              </p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
              <p className="text-xs font-medium text-purple-600">
                Users Matched
              </p>
              <p className="text-xl font-bold text-purple-800">
                {formatNumber(result.usersMatched)}
              </p>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
              <p className="text-xs font-medium text-indigo-600">
                Apps Classified
              </p>
              <p className="text-xl font-bold text-indigo-800">
                {formatNumber(result.classified)}
              </p>
            </div>
          </div>

          {/* Action breakdown */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-slate-700">
                Allow:{" "}
                <span className="font-semibold">
                  {formatNumber(result.actionBreakdown.allow)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-700">
                Deny:{" "}
                <span className="font-semibold">
                  {formatNumber(result.actionBreakdown.deny)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-slate-500" />
              <span className="text-sm text-slate-700">
                Drop:{" "}
                <span className="font-semibold">
                  {formatNumber(result.actionBreakdown.drop)}
                </span>
              </span>
            </div>
            {result.errors > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm text-amber-700">
                  {formatNumber(result.errors)} errors
                </span>
              </div>
            )}
          </div>

          {/* Action bar */}
          {totalActions > 0 && (
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${(result.actionBreakdown.allow / totalActions) * 100}%`,
                }}
              />
              <div
                className="h-full bg-red-500"
                style={{
                  width: `${(result.actionBreakdown.deny / totalActions) * 100}%`,
                }}
              />
              <div
                className="h-full bg-slate-400"
                style={{
                  width: `${(result.actionBreakdown.drop / totalActions) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Top applications */}
          {result.topApplications.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Top PAN-OS Applications
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {result.topApplications.map((app, idx) => (
                  <div
                    key={app.application}
                    className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-sm"
                  >
                    <span className="text-slate-700">
                      <span className="mr-2 text-xs text-slate-400">
                        {idx + 1}.
                      </span>
                      <span className="font-medium">{app.name}</span>
                      {app.name !== app.application && (
                        <span className="ml-1.5 text-xs text-slate-400">
                          ({app.application})
                        </span>
                      )}
                    </span>
                    <span className="ml-2 font-medium text-slate-900">
                      {formatNumber(app.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary note */}
          <p className="text-xs text-slate-500">
            {formatNumber(result.appsMatched)} App-IDs matched to existing apps.{" "}
            {result.newApps > 0 && (
              <>
                {formatNumber(result.newApps)} new apps were auto-created and
                will need review.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
