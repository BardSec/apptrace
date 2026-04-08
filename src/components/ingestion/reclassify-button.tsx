"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

export function ReclassifyButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    classified: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReclassify() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/classification", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Classification failed");
        return;
      }

      setResult({ classified: data.classified, errors: data.errors });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            App Classification
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Re-run the classification engine on all apps to update risk scores
            and data collection signals.
          </p>
        </div>
        <button
          onClick={handleReclassify}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Classifying...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Re-classify All Apps
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">
            Classified {result.classified} apps
            {result.errors > 0 && (
              <span className="text-amber-700">
                {" "}
                ({result.errors} errors)
              </span>
            )}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
}
