import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateGoalProjections } from "@/lib/services/ai/goals";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/services/ai/analysisCache";

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
    const force = request.nextUrl.searchParams.get("force") === "true";
    const cacheKey = `goals:${workspaceId}`;

    if (!force) {
      const cached = getAnalysisCache<
        Awaited<ReturnType<typeof generateGoalProjections>>
      >(cacheKey);
      if (cached) {
        return NextResponse.json({
          projections: cached.value,
          lastAnalysisAt: cached.analyzedAt,
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
    const cached = setAnalysisCache(cacheKey, projections);

    return NextResponse.json({
      projections,
      lastAnalysisAt: cached.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Goal projection generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
