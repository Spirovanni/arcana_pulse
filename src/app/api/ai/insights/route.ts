import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/services/ai/insights";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  getPersistedAnalysis,
  upsertPersistedAnalysis,
} from "@/lib/services/db/aiReports";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId, session } = auth;
  const userId = session.user.userId;
  const force = request.nextUrl.searchParams.get("force") === "true";
  const reportKey = "insights";

  try {
    if (!force) {
      const persisted = await getPersistedAnalysis<
        Awaited<ReturnType<typeof generateInsights>>
      >(workspaceId, userId, reportKey);
      if (persisted) {
        return NextResponse.json({
          insights: persisted.value,
          lastAnalysisAt: persisted.analyzedAt,
          generatedFresh: false,
        });
      }

      return NextResponse.json({
        insights: [],
        lastAnalysisAt: null,
        generatedFresh: false,
      });
    }

    const insights = await generateInsights(workspaceId);
    const persisted = await upsertPersistedAnalysis(
      workspaceId,
      userId,
      reportKey,
      insights
    );

    return NextResponse.json({
      insights,
      lastAnalysisAt: persisted.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
