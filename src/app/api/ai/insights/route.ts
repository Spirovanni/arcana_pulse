import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateInsights } from "@/lib/services/ai/insights";

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

    const insights = await generateInsights(workspaceId);

    return NextResponse.json({ insights });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
