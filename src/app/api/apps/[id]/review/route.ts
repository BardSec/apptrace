import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  reviewerName: z.string().min(1, "Reviewer name is required"),
  status: z.enum(["APPROVED", "PENDING_REVIEW", "RESTRICTED", "BLOCKED"]),
  notes: z.string(),
  riskAssessment: z.string().optional(),
  recommendedAction: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { reviewerName, status, notes, riskAssessment, recommendedAction } =
      validation.data;

    // Verify the app exists
    const app = await prisma.webApp.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Create review and update app status in a transaction
    const [review] = await prisma.$transaction([
      prisma.privacyReview.create({
        data: {
          webAppId: params.id,
          reviewerName,
          status,
          notes: notes || null,
          riskAssessment: riskAssessment || null,
          recommendedAction: recommendedAction || null,
          reviewedAt: new Date(),
        },
      }),
      prisma.webApp.update({
        where: { id: params.id },
        data: { approvalStatus: status },
      }),
    ]);

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
