import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum(["APPROVED", "PENDING_REVIEW", "RESTRICTED", "BLOCKED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validation = statusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status } = validation.data;

    // Verify the app exists
    const app = await prisma.webApp.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const updated = await prisma.webApp.update({
      where: { id: params.id },
      data: { approvalStatus: status },
    });

    return NextResponse.json({ success: true, approvalStatus: updated.approvalStatus });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
