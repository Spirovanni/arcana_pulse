import { NextRequest, NextResponse } from "next/server";
import { generateBudgetRecommendations } from "@/lib/services/ai/budgets";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/services/ai/analysisCache";

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";
    const force = request.nextUrl.searchParams.get("force") === "true";
    const cacheKey = `budgets:${workspaceId}`;

    if (!force) {
      const cached = getAnalysisCache<
        Awaited<ReturnType<typeof generateBudgetRecommendations>>
      >(cacheKey);
      if (cached) {
        return NextResponse.json({
          recommendations: cached.value,
          lastAnalysisAt: cached.analyzedAt,
          generatedFresh: false,
        });
      }

      return NextResponse.json({
        recommendations: [],
        lastAnalysisAt: null,
        generatedFresh: false,
      });
    }

    const recommendations = await generateBudgetRecommendations(workspaceId);
    const cached = setAnalysisCache(cacheKey, recommendations);

    return NextResponse.json({
      recommendations,
      lastAnalysisAt: cached.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Budget recommendation generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
