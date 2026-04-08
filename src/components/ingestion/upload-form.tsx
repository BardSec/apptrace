"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileUp,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type School = {
  id: string;
  name: string;
};

type UploadResult = {
  success: boolean;
  format: string;
  result: {
    totalRows: number;
    imported: number;
    matched: number;
    unmatched: number;
    errors: number;
  };
};

const SOURCE_TYPES = [
  { value: "dns_log", label: "DNS Log" },
  { value: "sso_log", label: "SSO Log" },
  { value: "browser_telemetry", label: "Browser Telemetry" },
  { value: "manual_csv", label: "Manual CSV" },
];

export function UploadForm({ schools }: { schools: School[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("dns_log");
  const [schoolId, setSchoolId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", sourceType);
      if (schoolId) formData.append("schoolId", schoolId);

      const res = await fetch("/api/ingestion/upload", {
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

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-slate-900">Upload Data</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* File input */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            File
          </label>
          <div className="relative">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.log"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError(null);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
            />
          </div>
          {file && (
            <p className="mt-1 text-xs text-slate-500">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Source type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Source Type
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            {SOURCE_TYPES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* School filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            School (optional)
          </label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload button */}
      <div className="mt-4">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Upload &amp; Import
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Import Complete
            </span>
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {result.format.toUpperCase()} format detected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-green-600">Total Rows</p>
              <p className="text-lg font-bold text-green-800">
                {result.result.totalRows}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">Imported</p>
              <p className="text-lg font-bold text-green-800">
                {result.result.imported}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">Matched to Apps</p>
              <p className="text-lg font-bold text-green-800">
                {result.result.matched}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">New Apps Created</p>
              <p className="text-lg font-bold text-amber-700">
                {result.result.unmatched}
              </p>
            </div>
          </div>
          {result.result.errors > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs text-amber-700">
                {result.result.errors} rows could not be parsed and were skipped
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
