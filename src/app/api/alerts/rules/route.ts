import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { requireAuth } from "@/lib/auth/withAuth";
import * as dbAlertRules from "@/lib/services/db/alertRules";
import { logAuditEvent } from "@/lib/services/db/auditLog";
import type { AlertRuleKind } from "@/lib/types";

const VALID_KINDS: AlertRuleKind[] = [
  "price_threshold",
  "strategy_signal",
  "paper_order_event",
  "risk_limit_breach",
];

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  try {
    const rules = await dbAlertRules.listAlertRules(workspaceId);
    return NextResponse.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  try {
    const body = await request.json();
    const { name, kind, config, channels, active } = body;

    // Validation
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!kind || !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (typeof config !== "string") {
      return NextResponse.json({ error: "config must be a JSON string" }, { status: 400 });
    }
    try {
      JSON.parse(config);
    } catch {
      return NextResponse.json({ error: "config must be a valid JSON string" }, { status: 400 });
    }
    if (!Array.isArray(channels) || channels.some(c => c !== "in_app" && c !== "email")) {
      return NextResponse.json({ error: "channels must be a subset of ['in_app', 'email']" }, { status: 400 });
    }

    const rule = await dbAlertRules.createAlertRule({
      workspaceId,
      createdBy: session.user.userId,
      name,
      kind,
      config,
      channels,
      active: active !== undefined ? active : true,
    });

    void logAuditEvent({
      workspaceId,
      userId: session.user.userId,
      userEmail: session.user.email,
      action: "alert_rule_created",
      targetEntity: "alertRule",
      targetId: rule.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: {
        name: rule.name,
        kind: rule.kind,
        channels: rule.channels,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
