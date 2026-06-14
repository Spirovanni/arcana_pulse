import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/services/ai/insights";
import { requireAuth } from "@/lib/auth/withAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  try {
    const insights = await generateInsights(workspaceId);

    return NextResponse.json({ insights });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
