import { NextRequest, NextResponse } from "next/server";
import { generateForecastWithSummary } from "@/lib/services/ai/forecast";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/services/ai/analysisCache";

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";
    const force = request.nextUrl.searchParams.get("force") === "true";
    const cacheKey = `forecast:${workspaceId}`;

    if (!force) {
      const cached =
        getAnalysisCache<Awaited<ReturnType<typeof generateForecastWithSummary>>>(
          cacheKey
        );
      if (cached) {
        return NextResponse.json({
          forecast: cached.value,
          lastAnalysisAt: cached.analyzedAt,
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
    const cached = setAnalysisCache(cacheKey, forecast);

    return NextResponse.json({
      forecast,
      lastAnalysisAt: cached.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Forecast generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
