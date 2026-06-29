import { NextRequest, NextResponse } from "next/server";
import {
  evaluateBudgetRecommendations,
  generateBudgetRecommendations,
} from "@/lib/services/ai/budgets";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  getPersistedAnalysis,
  upsertPersistedAnalysis,
} from "@/lib/services/db/aiReports";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  try {
    const workspaceId = auth.workspaceId;
    const userId = auth.session.user.userId;
    const force = request.nextUrl.searchParams.get("force") === "true";
    const evaluationScope =
      request.nextUrl.searchParams.get("evaluationScope") ?? "all";
    const preferImportedTransactions = evaluationScope === "imported";
    const reportKey = `budgets:${evaluationScope}`;

    if (!force) {
      const persisted = await getPersistedAnalysis<
        Awaited<ReturnType<typeof generateBudgetRecommendations>>
      >(workspaceId, userId, reportKey);
      if (persisted) {
        return NextResponse.json({
          recommendations: persisted.value,
          lastAnalysisAt: persisted.analyzedAt,
          evaluationCompletedAt: persisted.analyzedAt,
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
    const persisted = await upsertPersistedAnalysis(
      workspaceId,
      userId,
      reportKey,
      recommendations
    );

    return NextResponse.json({
      recommendations,
      lastAnalysisAt: persisted.analyzedAt,
      evaluationCompletedAt: persisted.analyzedAt,
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
