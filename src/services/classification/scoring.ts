/**
 * Risk scoring engine.
 * Computes a normalized risk score and data collection assessment
 * based on detected signals.
 */

import { type SignalResult, SIGNALS } from "./signals";

export interface ClassificationResult {
  riskScore: number;
  collectsData: "YES" | "NO" | "UNKNOWN";
  dataConfidence: number;
  signals: SignalResult[];
  likelyDataCategories: {
    category: string;
    confidence: number;
    evidence: string;
  }[];
}

/** Map from signal type to data categories it implies */
const SIGNAL_CATEGORY_MAP: Record<
  string,
  { category: string; evidence: string }[]
> = {
  login_required: [
    { category: "NAME", evidence: "Login requires student identity" },
    { category: "EMAIL", evidence: "Login requires email address" },
  ],
  sso_integration: [
    { category: "NAME", evidence: "SSO shares student name" },
    { category: "EMAIL", evidence: "SSO shares email address" },
    { category: "STUDENT_ID", evidence: "SSO may share student identifier" },
  ],
  social_media_category: [
    { category: "NAME", evidence: "Social media collects user identity" },
    { category: "EMAIL", evidence: "Social media requires email signup" },
    {
      category: "BEHAVIORAL_ACTIVITY",
      evidence: "Social media tracks user activity",
    },
    { category: "PHOTOS", evidence: "Social media enables photo sharing" },
    {
      category: "AUDIO_VIDEO",
      evidence: "Social media enables audio/video sharing",
    },
    {
      category: "LOCATION",
      evidence: "Social media may collect location data",
    },
  ],
  tracking_domains: [
    {
      category: "BEHAVIORAL_ACTIVITY",
      evidence: "Tracking domains collect browsing behavior",
    },
    {
      category: "DEVICE_IDENTIFIERS",
      evidence: "Tracking domains collect device fingerprints",
    },
  ],
  broad_data_access: [
    {
      category: "CLASS_ENROLLMENT",
      evidence: "API access may include class roster data",
    },
    {
      category: "ASSIGNMENT_CONTENT",
      evidence: "API access may include student work",
    },
  ],
};

export function calculateClassification(
  detectedSignals: SignalResult[]
): ClassificationResult {
  // Build a weight map from SIGNALS definitions
  const weightMap = new Map<string, number>();
  for (const s of SIGNALS) {
    weightMap.set(s.type, s.weight);
  }

  // Calculate max possible score (sum of all signal weights at confidence 1)
  const maxPossibleScore = SIGNALS.reduce((sum, s) => sum + s.weight, 0);

  // Calculate weighted sum
  const weightedSum = detectedSignals.reduce((sum, sr) => {
    const weight = weightMap.get(sr.signalType) ?? 0;
    return sum + weight * sr.confidence;
  }, 0);

  const riskScore = Math.min(
    100,
    Math.round((weightedSum / maxPossibleScore) * 100)
  );

  // Determine collectsData
  let collectsData: "YES" | "NO" | "UNKNOWN";
  if (riskScore > 40) {
    collectsData = "YES";
  } else if (riskScore < 15) {
    collectsData = "NO";
  } else {
    collectsData = "UNKNOWN";
  }

  // Calculate average confidence
  const dataConfidence =
    detectedSignals.length > 0
      ? detectedSignals.reduce((sum, s) => sum + s.confidence, 0) /
        detectedSignals.length
      : 0;

  // Build data categories from signals
  const categoryMap = new Map<
    string,
    { confidence: number; evidence: string }
  >();

  for (const signal of detectedSignals) {
    const categories = SIGNAL_CATEGORY_MAP[signal.signalType];
    if (!categories) continue;

    for (const cat of categories) {
      const existing = categoryMap.get(cat.category);
      if (!existing || signal.confidence > existing.confidence) {
        categoryMap.set(cat.category, {
          confidence: signal.confidence,
          evidence: cat.evidence,
        });
      }
    }
  }

  const likelyDataCategories = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      confidence: data.confidence,
      evidence: data.evidence,
    })
  );

  return {
    riskScore,
    collectsData,
    dataConfidence: Math.round(dataConfidence * 100) / 100,
    signals: detectedSignals,
    likelyDataCategories,
  };
}
