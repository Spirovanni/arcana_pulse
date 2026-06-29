import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { completeForFeature } from "@/lib/ai-router";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({} as {
    reportText?: string;
    currentScore?: number | null;
    targetScore?: number | null;
  }));

  const reportText = (body.reportText ?? "").trim();
  const currentScore = body.currentScore ?? null;
  const targetScore = body.targetScore ?? null;

  if (!reportText || reportText.length < 50) {
    return NextResponse.json(
      { error: "Please provide a credit report excerpt with enough detail to analyze." },
      { status: 400 }
    );
  }

  const clippedReport = reportText.slice(0, 30000);
  const prompt = [
    "Analyze this credit report content and create a practical score-improvement strategy.",
    `Current score (if known): ${currentScore ?? "unknown"}`,
    `Target score (if known): ${targetScore ?? "unknown"}`,
    "",
    "Return concise markdown with these sections:",
    "1) Snapshot of what is known (no fabricated numbers)",
    "2) Key factors hurting score",
    "3) 30-day actions",
    "4) 60-90 day actions",
    "5) Longer-term strategy (3-12 months)",
    "6) Risk alerts and what to avoid",
    "7) Weekly checklist",
    "",
    "Important constraints:",
    "- Never invent accounts, balances, utilization, delinquencies, or dates.",
    "- If a metric is missing, say 'not provided'.",
    "- Keep recommendations educational and non-legal.",
    "",
    "Credit report text:",
    clippedReport,
  ].join("\n");

  try {
    const strategy = await completeForFeature(
      "credit_monitoring",
      "You are a credit risk and personal finance advisor. Produce grounded, educational guidance only.",
      prompt,
      1800,
      { workspaceId: auth.workspaceId }
    );

    return NextResponse.json({
      strategy,
      lastAnalyzedAt: new Date().toISOString(),
      sourceChars: clippedReport.length,
      label: "educational",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate credit strategy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
