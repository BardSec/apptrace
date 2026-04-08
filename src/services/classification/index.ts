/**
 * Classification engine orchestrator.
 * Loads app data, runs signal detection, computes risk scores,
 * and persists classification results.
 */

import { prisma } from "@/lib/prisma";
import { type DataCategory, type IntegrationSourceType } from "@prisma/client";
import { SIGNALS, type SignalContext, type SignalResult } from "./signals";
import {
  calculateClassification,
  type ClassificationResult,
} from "./scoring";

export type { ClassificationResult } from "./scoring";

/**
 * Classify a single WebApp by ID.
 * Loads all relevant data, runs signals, computes scores, and persists results.
 */
export async function classifyApp(
  webAppId: string
): Promise<ClassificationResult> {
  // 1. Load the WebApp with all relations
  const app = await prisma.webApp.findUniqueOrThrow({
    where: { id: webAppId },
    include: {
      vendor: true,
      domainAliases: {
        select: { domain: true, domainType: true },
      },
    },
  });

  // 2. Aggregate observation data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    sourceTypeCounts,
    uniqueStudentCount,
    uniqueSchoolCount,
    uniqueDeviceCount,
    recentCount,
    schoolNames,
  ] = await Promise.all([
    prisma.observation.groupBy({
      by: ["sourceType"],
      where: { webAppId },
      _count: { id: true },
    }),
    prisma.observation.groupBy({
      by: ["studentId"],
      where: { webAppId, studentId: { not: null } },
    }),
    prisma.observation.groupBy({
      by: ["schoolId"],
      where: { webAppId, schoolId: { not: null } },
    }),
    prisma.observation.groupBy({
      by: ["deviceId"],
      where: { webAppId, deviceId: { not: null } },
    }),
    prisma.observation.count({
      where: { webAppId, timestamp: { gte: thirtyDaysAgo } },
    }),
    prisma.observation
      .findMany({
        where: { webAppId, schoolId: { not: null } },
        select: { school: { select: { name: true } } },
        distinct: ["schoolId"],
      })
      .then((obs) =>
        obs.map((o) => o.school?.name).filter((n): n is string => !!n)
      ),
  ]);

  // Build sourceTypes map
  const sourceTypes: Record<string, number> = {};
  for (const row of sourceTypeCounts) {
    sourceTypes[row.sourceType] = row._count.id;
  }

  const domainTypes = new Set(app.domainAliases.map((a) => a.domainType));

  // 3. Build the SignalContext
  const context: SignalContext = {
    app: {
      id: app.id,
      name: app.name,
      primaryDomain: app.primaryDomain,
      category: app.category,
      totalObservations: app.totalObservations,
      domainAliases: app.domainAliases,
    },
    observations: {
      sourceTypes,
      uniqueStudents: uniqueStudentCount.length,
      uniqueSchools: uniqueSchoolCount.length,
      hasLoginDomain: domainTypes.has("LOGIN"),
      hasTrackingDomain: domainTypes.has("TRACKING"),
      hasApiDomain: domainTypes.has("API"),
      uniqueDevices: uniqueDeviceCount.length,
      recentObservations: recentCount,
      schoolNames,
    },
    vendor: app.vendor
      ? {
          name: app.vendor.name,
          hasStudentPrivacyPolicy: app.vendor.hasStudentPrivacyPolicy,
          coppaCompliant: app.vendor.coppaCompliant,
          ferpaCompliant: app.vendor.ferpaCompliant,
        }
      : null,
  };

  // 4. Run all signals
  const detectedSignals: SignalResult[] = [];
  for (const signal of SIGNALS) {
    const result = signal.detect(context);
    if (result) {
      detectedSignals.push(result);
    }
  }

  // 5. Compute classification
  const classification = calculateClassification(detectedSignals);

  // 6. Persist results
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Update WebApp scores
    await tx.webApp.update({
      where: { id: webAppId },
      data: {
        riskScore: classification.riskScore,
        collectsData: classification.collectsData,
        dataConfidence: classification.dataConfidence,
      },
    });

    // Clear old signals and insert new ones
    await tx.dataCollectionSignal.deleteMany({
      where: { webAppId },
    });

    if (classification.signals.length > 0) {
      await tx.dataCollectionSignal.createMany({
        data: classification.signals.map((s) => ({
          webAppId,
          signalType: s.signalType,
          confidence: s.confidence,
          evidence: s.evidence,
          detectedAt: now,
          sourceType: "CSV_UPLOAD" as IntegrationSourceType,
        })),
      });
    }

    // Clear old data categories and insert new ones
    await tx.webAppDataCategory.deleteMany({
      where: { webAppId },
    });

    if (classification.likelyDataCategories.length > 0) {
      await tx.webAppDataCategory.createMany({
        data: classification.likelyDataCategories.map((cat) => ({
          webAppId,
          dataCategory: cat.category as DataCategory,
          confidence: cat.confidence,
          evidence: cat.evidence,
        })),
      });
    }
  });

  return classification;
}
