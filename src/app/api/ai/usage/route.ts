import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { getAIUsageSnapshot } from "@/lib/services/ai/usage";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  try {
    const usage = await getAIUsageSnapshot(auth.workspaceId);
    return NextResponse.json({ usage });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load AI usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
