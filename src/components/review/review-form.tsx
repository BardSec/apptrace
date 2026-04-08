"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "RESTRICTED", label: "Restricted" },
  { value: "BLOCKED", label: "Blocked" },
];

export function ReviewForm({
  appId,
  onClose,
}: {
  appId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reviewerName, setReviewerName] = useState("");
  const [status, setStatus] = useState("APPROVED");
  const [notes, setNotes] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewerName.trim()) {
      setError("Reviewer name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/apps/${appId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName: reviewerName.trim(),
          status,
          notes: notes.trim(),
          riskAssessment: riskAssessment.trim() || undefined,
          recommendedAction: recommendedAction.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit review");
        return;
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Submit Privacy Review
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reviewer Name *
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="General review notes..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Risk Assessment
          </label>
          <textarea
            value={riskAssessment}
            onChange={(e) => setRiskAssessment(e.target.value)}
            rows={2}
            placeholder="Assessment of privacy risk, data handling concerns..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Recommended Action
          </label>
          <textarea
            value={recommendedAction}
            onChange={(e) => setRecommendedAction(e.target.value)}
            rows={2}
            placeholder="Suggested next steps or policy actions..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Review
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
