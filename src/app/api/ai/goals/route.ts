import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { requireAuth } from "@/lib/auth/withAuth";
import { generateGoalProjections } from "@/lib/services/ai/goals";
import {
  getPersistedAnalysis,
  upsertPersistedAnalysis,
} from "@/lib/services/db/aiReports";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const workspaceId = auth.workspaceId;
    const userId = auth.session.user.userId;
    const force = request.nextUrl.searchParams.get("force") === "true";
    const reportKey = "goals";

    if (!force) {
      const persisted = await getPersistedAnalysis<
        Awaited<ReturnType<typeof generateGoalProjections>>
      >(workspaceId, userId, reportKey);
      if (persisted) {
        return NextResponse.json({
          projections: persisted.value,
          lastAnalysisAt: persisted.analyzedAt,
          generatedFresh: false,
        });
      }

      return NextResponse.json({
        projections: [],
        lastAnalysisAt: null,
        generatedFresh: false,
      });
    }

    const projections = await generateGoalProjections(workspaceId);
    const persisted = await upsertPersistedAnalysis(
      workspaceId,
      userId,
      reportKey,
      projections
    );

    return NextResponse.json({
      projections,
      lastAnalysisAt: persisted.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Goal projection generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
