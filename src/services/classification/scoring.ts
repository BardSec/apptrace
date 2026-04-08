/**
 * Risk scoring engine.
 * Computes a normalized risk score based on detected signals.
 */

import { type Signal } from "./signals";

export interface RiskScore {
  total: number;
  maxPossible: number;
  normalized: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
}

export function calculateRiskScore(detectedSignals: Signal[]): RiskScore {
  const total = detectedSignals.reduce((sum, s) => sum + s.weight, 0);
  const maxPossible = 25; // sum of all defined signal weights
  const normalized = Math.min(Math.round((total / maxPossible) * 100), 100);

  let level: RiskScore["level"];
  if (normalized <= 25) level = "low";
  else if (normalized <= 50) level = "medium";
  else if (normalized <= 75) level = "high";
  else level = "critical";

  return { total, maxPossible, normalized, level };
}
