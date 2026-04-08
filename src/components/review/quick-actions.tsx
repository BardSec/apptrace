"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function QuickActions({ appId }: { appId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(status: "APPROVED" | "BLOCKED") {
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
      // Silently fail — the row will still be visible for retry
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => updateStatus("APPROVED")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
        title="Approve"
      >
        {loading === "APPROVED" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5" />
        )}
        Approve
      </button>
      <button
        onClick={() => updateStatus("BLOCKED")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        title="Block"
      >
        {loading === "BLOCKED" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Block
      </button>
    </div>
  );
}
