import { Info, AlertTriangle } from "lucide-react";

interface ConfidenceDisclaimerProps {
  level?: "high" | "medium" | "low";
  sources?: string[];
  message?: string;
  compact?: boolean;
}

const defaultMessages: Record<string, (sources: string[]) => string> = {
  high: (sources) =>
    `Detection confidence is high based on ${sources.length > 0 ? sources.join(", ") : "multiple signals"}. Multiple corroborating signals observed.`,
  medium: (sources) =>
    `Detection based on ${sources.length > 0 ? sources.join(", ") : "available signals"}. Browser-level confirmation not available on iOS devices.`,
  low: (_sources) =>
    `Limited detection confidence. Based on DNS activity only — endpoint visibility is restricted on managed Apple devices.`,
};

const levelStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  high: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    icon: "text-blue-500",
  },
  medium: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
  low: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    icon: "text-slate-400",
  },
};

export function ConfidenceDisclaimer({
  level = "medium",
  sources = [],
  message,
  compact = false,
}: ConfidenceDisclaimerProps) {
  const styles = levelStyles[level] ?? levelStyles.medium;
  const displayMessage =
    message ?? defaultMessages[level]?.(sources) ?? defaultMessages.medium(sources);
  const Icon = level === "low" ? AlertTriangle : Info;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded ${styles.bg} ${styles.border} border px-2.5 py-1.5`}
      >
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${styles.icon}`} />
        <p className={`text-xs ${styles.text}`}>{displayMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg ${styles.bg} ${styles.border} border p-4`}
    >
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${styles.icon}`} />
      <p className={`text-sm ${styles.text}`}>{displayMessage}</p>
    </div>
  );
}
