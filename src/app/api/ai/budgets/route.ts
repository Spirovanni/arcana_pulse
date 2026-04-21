import { NextRequest, NextResponse } from "next/server";
import { generateBudgetRecommendations } from "@/lib/services/ai/budgets";

export async function GET(request: NextRequest) {
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
