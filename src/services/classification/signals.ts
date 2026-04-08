/**
 * Signal definitions for data collection detection.
 * Each signal represents a behavioral pattern or characteristic that indicates
 * potential student data collection in a K-12 Apple environment.
 */

export interface Signal {
  type: string;
  label: string;
  weight: number; // 1-10, higher = more concerning
  detect: (context: SignalContext) => SignalResult | null;
}

export interface SignalContext {
  app: {
    id: string;
    name: string;
    primaryDomain: string;
    category: string;
    totalObservations: number;
    domainAliases: { domain: string; domainType: string }[];
  };
  observations: {
    sourceTypes: Record<string, number>; // sourceType -> count
    uniqueStudents: number;
    uniqueSchools: number;
    hasLoginDomain: boolean;
    hasTrackingDomain: boolean;
    hasApiDomain: boolean;
    uniqueDevices: number;
    recentObservations: number; // last 30 days
    schoolNames: string[];
  };
  vendor: {
    name: string;
    hasStudentPrivacyPolicy: boolean;
    coppaCompliant: boolean | null;
    ferpaCompliant: boolean | null;
  } | null;
}

export interface SignalResult {
  signalType: string;
  confidence: number; // 0-1
  evidence: string; // human-readable explanation
}

export const SIGNALS: Signal[] = [
  {
    type: "login_required",
    label: "Login Required",
    weight: 8,
    detect(ctx) {
      const loginAliases = ctx.app.domainAliases.filter(
        (a) => a.domainType === "LOGIN"
      );
      const ssoCount = ctx.observations.sourceTypes["SSO_LOG"] ?? 0;

      if (loginAliases.length > 0) {
        const loginDomain = loginAliases[0].domain;
        const evidence =
          ssoCount > 0
            ? `Login domain detected (${loginDomain}) with ${ssoCount} SSO events`
            : `Login domain detected (${loginDomain})`;
        return {
          signalType: "login_required",
          confidence: ssoCount > 0 ? 0.95 : 0.7,
          evidence,
        };
      }

      if (ssoCount > 0) {
        return {
          signalType: "login_required",
          confidence: 0.9,
          evidence: `${ssoCount} SSO authentication events observed`,
        };
      }

      return null;
    },
  },
  {
    type: "sso_integration",
    label: "SSO Integration",
    weight: 7,
    detect(ctx) {
      const ssoCount = ctx.observations.sourceTypes["SSO_LOG"] ?? 0;
      if (ssoCount <= 0) return null;

      const studentText =
        ctx.observations.uniqueStudents > 0
          ? ` for ${ctx.observations.uniqueStudents} students`
          : "";
      return {
        signalType: "sso_integration",
        confidence: Math.min(0.6 + ssoCount * 0.02, 1),
        evidence: `SSO authentication events observed${studentText}`,
      };
    },
  },
  {
    type: "high_student_usage",
    label: "High Student Usage",
    weight: 5,
    detect(ctx) {
      if (ctx.observations.uniqueStudents <= 10) return null;

      const schoolText =
        ctx.observations.uniqueSchools > 1
          ? ` across ${ctx.observations.uniqueSchools} schools`
          : "";
      return {
        signalType: "high_student_usage",
        confidence: Math.min(0.5 + ctx.observations.uniqueStudents * 0.01, 1),
        evidence: `Used by ${ctx.observations.uniqueStudents} students${schoolText}`,
      };
    },
  },
  {
    type: "tracking_domains",
    label: "Tracking Domains",
    weight: 6,
    detect(ctx) {
      const trackingAliases = ctx.app.domainAliases.filter(
        (a) => a.domainType === "TRACKING"
      );
      if (trackingAliases.length === 0) return null;

      const domains = trackingAliases.map((a) => a.domain).join(", ");
      return {
        signalType: "tracking_domains",
        confidence: 0.85,
        evidence: `Tracking domain detected: ${domains}`,
      };
    },
  },
  {
    type: "no_privacy_policy",
    label: "No Privacy Policy",
    weight: 8,
    detect(ctx) {
      if (!ctx.vendor) return null;
      if (ctx.vendor.hasStudentPrivacyPolicy) return null;

      return {
        signalType: "no_privacy_policy",
        confidence: 0.9,
        evidence: `Vendor ${ctx.vendor.name} has no student privacy policy on file`,
      };
    },
  },
  {
    type: "not_coppa_compliant",
    label: "Not COPPA Compliant",
    weight: 7,
    detect(ctx) {
      if (!ctx.vendor) return null;
      if (ctx.vendor.coppaCompliant !== false) return null;

      return {
        signalType: "not_coppa_compliant",
        confidence: 0.95,
        evidence: `Vendor is not COPPA compliant`,
      };
    },
  },
  {
    type: "not_ferpa_compliant",
    label: "Not FERPA Compliant",
    weight: 7,
    detect(ctx) {
      if (!ctx.vendor) return null;
      if (ctx.vendor.ferpaCompliant !== false) return null;

      return {
        signalType: "not_ferpa_compliant",
        confidence: 0.95,
        evidence: `Vendor is not FERPA compliant`,
      };
    },
  },
  {
    type: "social_media_category",
    label: "Social Media Platform",
    weight: 9,
    detect(ctx) {
      if (ctx.app.category !== "SOCIAL_MEDIA") return null;

      return {
        signalType: "social_media_category",
        confidence: 0.95,
        evidence: `Classified as social media platform`,
      };
    },
  },
  {
    type: "broad_data_access",
    label: "Broad Data Access",
    weight: 6,
    detect(ctx) {
      const hasApi = ctx.observations.hasApiDomain;
      const highUsage = ctx.observations.uniqueStudents > 10;
      if (!hasApi || !highUsage) return null;

      return {
        signalType: "broad_data_access",
        confidence: 0.75,
        evidence: `API endpoints detected with broad student access (${ctx.observations.uniqueStudents} students)`,
      };
    },
  },
  {
    type: "unknown_vendor",
    label: "Unknown Vendor",
    weight: 5,
    detect(ctx) {
      if (ctx.vendor !== null) return null;

      return {
        signalType: "unknown_vendor",
        confidence: 0.6,
        evidence: `No vendor information available — data practices unknown`,
      };
    },
  },
  {
    type: "elementary_usage",
    label: "Elementary School Usage",
    weight: 4,
    detect(ctx) {
      const elementarySchools = ctx.observations.schoolNames.filter((name) =>
        /elementary/i.test(name)
      );
      if (elementarySchools.length === 0) return null;

      const schoolName = elementarySchools[0];
      return {
        signalType: "elementary_usage",
        confidence: 0.7,
        evidence: `Observed in use at ${schoolName}`,
      };
    },
  },
  {
    type: "cross_school_usage",
    label: "Cross-School Usage",
    weight: 3,
    detect(ctx) {
      if (ctx.observations.uniqueSchools <= 1) return null;

      return {
        signalType: "cross_school_usage",
        confidence: 0.8,
        evidence: `Active across ${ctx.observations.uniqueSchools} schools district-wide`,
      };
    },
  },
];
