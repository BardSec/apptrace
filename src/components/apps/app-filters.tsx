"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, Filter, Download, ArrowUpDown, X } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
}

interface AppFiltersProps {
  vendors: Vendor[];
  totalCount: number;
  filteredCount: number;
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

const LAST_SEEN_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const COLLECTS_DATA_OPTIONS = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "UNKNOWN", label: "Unknown" },
];

const SORT_OPTIONS = [
  { value: "risk", label: "Risk Score" },
  { value: "name", label: "Name A-Z" },
  { value: "lastSeen", label: "Last Seen" },
  { value: "observations", label: "Observations" },
  { value: "confidence", label: "Confidence" },
];

export function AppFilters({ vendors, totalCount, filteredCount }: AppFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentRisk = searchParams.get("risk") ?? "";
  const currentLastSeen = searchParams.get("lastSeen") ?? "";
  const currentVendor = searchParams.get("vendor") ?? "";
  const currentCollectsData = searchParams.get("collectsData") ?? "";
  const currentSort = searchParams.get("sort") ?? "risk";

  const hasFilters =
    currentQ ||
    currentCategory ||
    currentStatus ||
    currentRisk ||
    currentLastSeen ||
    currentVendor ||
    currentCollectsData ||
    currentSort !== "risk";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/apps?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    updateParams({ q });
  };

  const exportUrl = () => {
    const params = new URLSearchParams();
    params.set("type", "all-apps");
    if (currentQ) params.set("q", currentQ);
    if (currentCategory) params.set("category", currentCategory);
    if (currentStatus) params.set("status", currentStatus);
    if (currentRisk) params.set("risk", currentRisk);
    if (currentLastSeen) params.set("lastSeen", currentLastSeen);
    if (currentVendor) params.set("vendor", currentVendor);
    if (currentCollectsData) params.set("collectsData", currentCollectsData);
    return `/api/reports/export?${params.toString()}`;
  };

  const selectClass =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Search */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Search
          </label>
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={currentQ}
              placeholder="Search apps or domains..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </form>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Category
          </label>
          <select
            value={currentCategory}
            onChange={(e) => updateParams({ category: e.target.value })}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            value={currentStatus}
            onChange={(e) => updateParams({ status: e.target.value })}
            className={selectClass}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Level */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Risk Level
          </label>
          <select
            value={currentRisk}
            onChange={(e) => updateParams({ risk: e.target.value })}
            className={selectClass}
          >
            <option value="">All Levels</option>
            <option value="high">High (&gt;60)</option>
            <option value="medium">Medium (30-60)</option>
            <option value="low">Low (&lt;30)</option>
          </select>
        </div>

        {/* Last Seen */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Last Seen
          </label>
          <select
            value={currentLastSeen}
            onChange={(e) => updateParams({ lastSeen: e.target.value })}
            className={selectClass}
          >
            <option value="">All Time</option>
            {LAST_SEEN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Vendor
          </label>
          <select
            value={currentVendor}
            onChange={(e) => updateParams({ vendor: e.target.value })}
            className={selectClass}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Collects Data */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Collects Data
          </label>
          <select
            value={currentCollectsData}
            onChange={(e) => updateParams({ collectsData: e.target.value })}
            className={selectClass}
          >
            <option value="">Any</option>
            {COLLECTS_DATA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            <ArrowUpDown className="mr-1 inline h-3 w-3" />
            Sort By
          </label>
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className={selectClass}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count + actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">{filteredCount}</span>{" "}
            of{" "}
            <span className="font-medium text-slate-700">{totalCount}</span>{" "}
            apps
          </p>
          {hasFilters && (
            <button
              onClick={() => router.push("/apps")}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
        <a
          href={exportUrl()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>
    </div>
  );
}
