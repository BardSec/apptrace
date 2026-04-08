import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

const CATEGORIES = [
  "LMS", "ASSESSMENT", "COMMUNICATION", "PRODUCTIVITY", "CREATIVE",
  "REFERENCE", "SOCIAL_MEDIA", "VIDEO", "GAMING", "UTILITY",
  "SSO_IDP", "CDN_INFRASTRUCTURE", "ANALYTICS", "ADVERTISING", "UNKNOWN",
];

const STATUSES = [
  "APPROVED", "PENDING_REVIEW", "RESTRICTED", "BLOCKED", "UNKNOWN",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const today = new Date().toISOString().split("T")[0];

  if (!type) {
    return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
  }

  let csv = "";
  let filename = `apptrace-${type}-${today}.csv`;

  if (type === "all-apps") {
    // Build where clause from optional filter params
    const where: Prisma.WebAppWhereInput = {};
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const risk = searchParams.get("risk");
    const lastSeen = searchParams.get("lastSeen");
    const vendor = searchParams.get("vendor");
    const collectsData = searchParams.get("collectsData");

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { primaryDomain: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category && CATEGORIES.includes(category)) {
      where.category = category as Prisma.EnumAppCategoryFilter;
    }
    if (status && STATUSES.includes(status)) {
      where.approvalStatus = status as Prisma.EnumApprovalStatusFilter;
    }
    if (risk === "high") where.riskScore = { gt: 60 };
    else if (risk === "medium") where.riskScore = { gt: 30, lte: 60 };
    else if (risk === "low") where.riskScore = { lte: 30 };
    if (lastSeen && lastSeen !== "all") {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[lastSeen] ?? 90;
      where.lastSeenAt = { gte: new Date(Date.now() - days * 86400000) };
    }
    if (vendor) where.vendorId = vendor;
    if (collectsData && ["YES", "NO", "UNKNOWN"].includes(collectsData)) {
      where.collectsData = collectsData as Prisma.EnumDataCollectionLikelihoodFilter;
    }

    const apps = await prisma.webApp.findMany({
      where,
      orderBy: { riskScore: "desc" },
      include: { vendor: true },
    });

    const headers = [
      "Name", "Vendor", "Category", "Status", "Risk Score",
      "Collects Data", "Confidence", "First Seen", "Last Seen", "Observations",
    ];
    const rows = apps.map((app) => [
      app.name,
      app.vendor?.name ?? "",
      app.category.replace(/_/g, " "),
      app.approvalStatus.replace(/_/g, " "),
      Math.round(app.riskScore),
      app.collectsData,
      `${Math.round(app.dataConfidence * 100)}%`,
      formatDate(app.firstSeenAt),
      formatDate(app.lastSeenAt),
      app.totalObservations,
    ]);
    csv = toCSV(headers, rows);
  } else if (type === "needs-review") {
    const apps = await prisma.webApp.findMany({
      where: { approvalStatus: { in: ["PENDING_REVIEW", "UNKNOWN"] } },
      orderBy: { riskScore: "desc" },
      include: { vendor: true },
    });

    const headers = [
      "Name", "Vendor", "Category", "Status", "Risk Score",
      "Collects Data", "Confidence", "First Seen", "Last Seen", "Observations",
    ];
    const rows = apps.map((app) => [
      app.name,
      app.vendor?.name ?? "",
      app.category.replace(/_/g, " "),
      app.approvalStatus.replace(/_/g, " "),
      Math.round(app.riskScore),
      app.collectsData,
      `${Math.round(app.dataConfidence * 100)}%`,
      formatDate(app.firstSeenAt),
      formatDate(app.lastSeenAt),
      app.totalObservations,
    ]);
    csv = toCSV(headers, rows);
  } else if (type === "high-risk") {
    const apps = await prisma.webApp.findMany({
      where: { riskScore: { gt: 60 } },
      orderBy: { riskScore: "desc" },
      include: {
        vendor: true,
        dataCollectionSignals: { select: { signalType: true } },
      },
    });

    const headers = [
      "Name", "Vendor", "Category", "Status", "Risk Score",
      "Collects Data", "Confidence", "First Seen", "Last Seen",
      "Observations", "Detected Signals",
    ];
    const rows = apps.map((app) => {
      const signals = Array.from(
        new Set(app.dataCollectionSignals.map((s) => s.signalType.replace(/_/g, " ")))
      ).join("; ");
      return [
        app.name,
        app.vendor?.name ?? "",
        app.category.replace(/_/g, " "),
        app.approvalStatus.replace(/_/g, " "),
        Math.round(app.riskScore),
        app.collectsData,
        `${Math.round(app.dataConfidence * 100)}%`,
        formatDate(app.firstSeenAt),
        formatDate(app.lastSeenAt),
        app.totalObservations,
        signals,
      ];
    });
    csv = toCSV(headers, rows);
  } else if (type === "vendor-summary") {
    const vendors = await prisma.vendor.findMany({
      include: {
        webApps: {
          select: { id: true, totalObservations: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "Vendor", "Country", "App Count", "COPPA", "FERPA",
      "Privacy Policy", "Total Observations",
    ];
    const rows = vendors.map((v) => [
      v.name,
      v.headquartersCountry ?? "",
      v.webApps.length,
      v.coppaCompliant === true ? "Yes" : v.coppaCompliant === false ? "No" : "Unknown",
      v.ferpaCompliant === true ? "Yes" : v.ferpaCompliant === false ? "No" : "Unknown",
      v.hasStudentPrivacyPolicy ? "Yes" : "No",
      v.webApps.reduce((sum, app) => sum + app.totalObservations, 0),
    ]);
    csv = toCSV(headers, rows);
  } else {
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
