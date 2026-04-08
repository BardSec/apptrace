"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ShieldAlert,
  XCircle,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { ReviewForm } from "@/components/review/review-form";

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  PENDING_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  RESTRICTED: "bg-orange-100 text-orange-700 border-orange-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
  UNKNOWN: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING_REVIEW: "Pending Review",
  RESTRICTED: "Restricted",
  BLOCKED: "Blocked",
  UNKNOWN: "Unknown",
};

export function AppActions({
  appId,
  currentStatus,
}: {
  appId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  async function updateStatus(status: string) {
    setLoading(status);
    try {
      const res = await fetch(`/api/apps/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Allow retry
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[currentStatus] || STATUS_COLORS.UNKNOWN}`}
        >
          {STATUS_LABELS[currentStatus] || currentStatus}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={() => updateStatus("APPROVED")}
          disabled={loading !== null || currentStatus === "APPROVED"}
          className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "APPROVED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approve
        </button>

        <button
          onClick={() => updateStatus("RESTRICTED")}
          disabled={loading !== null || currentStatus === "RESTRICTED"}
          className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "RESTRICTED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          Restrict
        </button>

        <button
          onClick={() => updateStatus("BLOCKED")}
          disabled={loading !== null || currentStatus === "BLOCKED"}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "BLOCKED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Block
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <ClipboardCheck className="h-4 w-4" />
          {showReviewForm ? "Hide Review Form" : "Submit Review"}
        </button>
      </div>

      {/* Review form */}
      {showReviewForm && (
        <ReviewForm
          appId={appId}
          onClose={() => setShowReviewForm(false)}
        />
      )}
    </div>
  );
}
