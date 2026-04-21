import { NextRequest, NextResponse } from "next/server";
import { generateForecastWithSummary } from "@/lib/services/ai/forecast";

export async function GET(request: NextRequest) {
  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

    const forecast = await generateForecastWithSummary(workspaceId);

    return NextResponse.json({ forecast });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Forecast generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
