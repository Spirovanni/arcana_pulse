import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { requireAuth } from "@/lib/auth/withAuth";
import * as dbAlertRules from "@/lib/services/db/alertRules";
import { logAuditEvent } from "@/lib/services/db/auditLog";
import type { AlertRuleKind } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_KINDS: AlertRuleKind[] = [
  "price_threshold",
  "strategy_signal",
  "paper_order_event",
  "risk_limit_breach",
];

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  try {
    const rule = await dbAlertRules.getAlertRule(id);
    if (!rule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (rule.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Access to this workspace is not permitted" },
        { status: 403 }
      );
    }

    return NextResponse.json(rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  try {
    const rule = await dbAlertRules.getAlertRule(id);
    if (!rule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (rule.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Access to this workspace is not permitted" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, kind, config, channels, active, lastTriggeredAt } = body;

    // Validation on fields if they are provided
    if (name !== undefined && (typeof name !== "string" || !name)) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (kind !== undefined && !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (config !== undefined) {
      if (typeof config !== "string") {
        return NextResponse.json({ error: "config must be a JSON string" }, { status: 400 });
      }
      try {
        JSON.parse(config);
      } catch {
        return NextResponse.json({ error: "config must be a valid JSON string" }, { status: 400 });
      }
    }
    if (channels !== undefined) {
      if (!Array.isArray(channels) || channels.some(c => c !== "in_app" && c !== "email")) {
        return NextResponse.json({ error: "channels must be a subset of ['in_app', 'email']" }, { status: 400 });
      }
    }

    const updatedRule = await dbAlertRules.updateAlertRule(id, {
      name,
      kind,
      config,
      channels,
      active,
      lastTriggeredAt,
    });

    // Audit logs: alert_rule_deleted when active transitions to false
    if (active === false && rule.active !== false) {
      void logAuditEvent({
        workspaceId,
        userId: session.user.userId,
        userEmail: session.user.email,
        action: "alert_rule_deleted",
        targetEntity: "alertRule",
        targetId: id,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
        userAgent: request.headers.get("user-agent") ?? "",
        metadata: {
          reason: "deactivated",
        },
      });
    }

    return NextResponse.json(updatedRule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  try {
    const rule = await dbAlertRules.getAlertRule(id);
    if (!rule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (rule.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Access to this workspace is not permitted" },
        { status: 403 }
      );
    }

    await dbAlertRules.deleteAlertRule(id);

    void logAuditEvent({
      workspaceId,
      userId: session.user.userId,
      userEmail: session.user.email,
      action: "alert_rule_deleted",
      targetEntity: "alertRule",
      targetId: id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: {
        reason: "deleted",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
