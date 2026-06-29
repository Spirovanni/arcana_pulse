import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { completeForFeature } from "@/lib/ai-router";
import {
  createCreditReport,
  getCreditReport,
  updateCreditReport,
} from "@/lib/services/db/creditMonitoring";
import type { CreditStrategyRevision } from "@/lib/types";

function makeRevisionId(): string {
  return `crv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({} as {
    reportId?: string;
    title?: string;
    reportText?: string;
    currentScore?: number | null;
    targetScore?: number | null;
  }));

  let report = body.reportId ? await getCreditReport(body.reportId) : null;
  if (report && (report.workspaceId !== auth.workspaceId || report.userId !== auth.session.user.userId)) {
    return NextResponse.json({ error: "Credit report not found" }, { status: 404 });
  }

  const reportText = (body.reportText ?? report?.reportText ?? "").trim();
  if (reportText.length < 50) {
    return NextResponse.json(
      { error: "Please provide a report excerpt with enough detail." },
      { status: 400 }
    );
  }

  if (!report) {
    report = await createCreditReport({
      workspaceId: auth.workspaceId,
      userId: auth.session.user.userId,
      title: (body.title ?? "Credit Report").slice(0, 120),
      reportText: reportText.slice(0, 60000),
      currentScore:
        typeof body.currentScore === "number" ? body.currentScore : undefined,
      targetScore:
        typeof body.targetScore === "number" ? body.targetScore : undefined,
    });
  }

  const currentScore =
    typeof body.currentScore === "number" ? body.currentScore : report.currentScore;
  const targetScore =
    typeof body.targetScore === "number" ? body.targetScore : report.targetScore;
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

    const now = new Date().toISOString();
    const revision: CreditStrategyRevision = {
      revisionId: makeRevisionId(),
      createdAt: now,
      strategy,
      sourceChars: clippedReport.length,
    };

    const updated = await updateCreditReport(report.reportId, {
      title: (body.title ?? report.title).slice(0, 120),
      reportText: reportText.slice(0, 60000),
      currentScore: typeof currentScore === "number" ? currentScore : undefined,
      targetScore: typeof targetScore === "number" ? targetScore : undefined,
      strategyRevisions: [...report.strategyRevisions, revision],
      lastAnalyzedAt: now,
    });

    return NextResponse.json({
      report: updated,
      strategy,
      lastAnalyzedAt: now,
      sourceChars: clippedReport.length,
      label: "educational",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate strategy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
