import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  createCreditReport,
  listCreditReports,
} from "@/lib/services/db/creditMonitoring";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  try {
    const reports = await listCreditReports(
      auth.workspaceId,
      auth.session.user.userId
    );
    return NextResponse.json({ reports });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load credit reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({} as {
    title?: string;
    reportText?: string;
    currentScore?: number | null;
    targetScore?: number | null;
  }));

  const reportText = (body.reportText ?? "").trim();
  if (!reportText) {
    return NextResponse.json(
      { error: "reportText is required" },
      { status: 400 }
    );
  }

  try {
    const report = await createCreditReport({
      workspaceId: auth.workspaceId,
      userId: auth.session.user.userId,
      title: (body.title ?? "Credit Report").slice(0, 120),
      reportText: reportText.slice(0, 60000),
      currentScore:
        typeof body.currentScore === "number" ? body.currentScore : undefined,
      targetScore:
        typeof body.targetScore === "number" ? body.targetScore : undefined,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create credit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
