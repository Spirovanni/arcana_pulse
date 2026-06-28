import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/services/ai/insights";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  getAnalysisCache,
  setAnalysisCache,
} from "@/lib/services/ai/analysisCache";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;
  const force = request.nextUrl.searchParams.get("force") === "true";
  const cacheKey = `insights:${workspaceId}`;

  try {
    if (!force) {
      const cached = getAnalysisCache<Awaited<ReturnType<typeof generateInsights>>>(
        cacheKey
      );
      if (cached) {
        return NextResponse.json({
          insights: cached.value,
          lastAnalysisAt: cached.analyzedAt,
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
    const cached = setAnalysisCache(cacheKey, insights);

    return NextResponse.json({
      insights,
      lastAnalysisAt: cached.analyzedAt,
      generatedFresh: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
