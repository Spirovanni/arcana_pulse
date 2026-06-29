import { NextRequest, NextResponse } from "next/server";
import { generateForecastWithSummary } from "@/lib/services/ai/forecast";
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
    const reportKey = "forecast";

    if (!force) {
      const persisted = await getPersistedAnalysis<
        Awaited<ReturnType<typeof generateForecastWithSummary>>
      >(workspaceId, userId, reportKey);
      if (persisted) {
        return NextResponse.json({
          forecast: persisted.value,
          lastAnalysisAt: persisted.analyzedAt,
          generatedFresh: false,
        });
      }

      return NextResponse.json({
        forecast: null,
        lastAnalysisAt: null,
        generatedFresh: false,
      });
    }

    const forecast = await generateForecastWithSummary(workspaceId);
    const persisted = await upsertPersistedAnalysis(
      workspaceId,
      userId,
      reportKey,
      forecast
    );

    return NextResponse.json({
      forecast,
      lastAnalysisAt: persisted.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Forecast generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
