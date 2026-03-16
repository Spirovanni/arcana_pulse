import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateBudgetRecommendations } from "@/lib/services/ai/budgets";

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

    const recommendations = await generateBudgetRecommendations(workspaceId);

    return NextResponse.json({ recommendations });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Budget recommendation generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
