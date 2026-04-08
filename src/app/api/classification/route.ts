import { NextResponse } from "next/server";
import { classifyAllApps } from "@/services/classification/classify-all";

export async function POST() {
  try {
    const result = await classifyAllApps();

    return NextResponse.json({
      success: true,
      classified: result.classified,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      {
        error: "Classification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
