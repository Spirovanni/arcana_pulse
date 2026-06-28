import { NextRequest, NextResponse } from "next/server";
import {
  evaluateBudgetRecommendations,
  generateBudgetRecommendations,
} from "@/lib/services/ai/budgets";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/services/ai/analysisCache";

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";
    const force = request.nextUrl.searchParams.get("force") === "true";
    const evaluationScope =
      request.nextUrl.searchParams.get("evaluationScope") ?? "all";
    const preferImportedTransactions = evaluationScope === "imported";
    const cacheKey = `budgets:${workspaceId}:${evaluationScope}`;

    if (!force) {
      const cached = getAnalysisCache<
        Awaited<ReturnType<typeof generateBudgetRecommendations>>
      >(cacheKey);
      if (cached) {
        return NextResponse.json({
          recommendations: cached.value,
          lastAnalysisAt: cached.analyzedAt,
          evaluationCompletedAt: cached.analyzedAt,
          evaluationScope,
          generatedFresh: false,
        });
      }

      return NextResponse.json({
        recommendations: [],
        lastAnalysisAt: null,
        evaluationCompletedAt: null,
        evaluationScope,
        generatedFresh: false,
      });
    }

    const evaluation = await evaluateBudgetRecommendations(workspaceId, {
      preferImportedTransactions,
    });
    const recommendations = evaluation.recommendations;
    const cached = setAnalysisCache(cacheKey, recommendations);

    return NextResponse.json({
      recommendations,
      lastAnalysisAt: cached.analyzedAt,
      evaluationCompletedAt: cached.analyzedAt,
      evaluationScope: evaluation.sourceScope,
      evaluatedTransactionCount: evaluation.transactionCount,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Budget recommendation generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
