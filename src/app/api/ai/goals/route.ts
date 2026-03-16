import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateGoalProjections } from "@/lib/services/ai/goals";

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

    const projections = await generateGoalProjections(workspaceId);

    return NextResponse.json({ projections });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Goal projection generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
