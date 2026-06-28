import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  markRead,
  markAllRead,
  addNotification,
} from "@/lib/services/notifications";
import { requireAuth } from "@/lib/auth/withAuth";
import { routePushToWorkspace } from "@/lib/services/notificationPush";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: workspaceId,
  });
  if (!auth.ok) return auth.response;

  const notifications = getNotifications(auth.workspaceId);
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    all?: boolean;
    workspaceId?: string;
  };
  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  if (body.all) {
    markAllRead(auth.workspaceId);
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    markRead(body.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or all:true" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    type?: "large_transaction" | "budget_warning" | "ai_insight" | "transfer_status" | "anomaly" | "goal_progress";
    severity?: "info" | "warning" | "critical";
    title?: string;
    message?: string;
    href?: string;
    sendPush?: boolean;
  };

  const auth = await requireAuth(request, {
    requiredRole: "member",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  if (!body.type || !body.severity || !body.title || !body.message) {
    return NextResponse.json(
      { error: "type, severity, title, and message are required" },
      { status: 400 }
    );
  }

  const notification = addNotification({
    workspaceId: auth.workspaceId,
    type: body.type,
    severity: body.severity,
    title: body.title,
    body: body.message,
    href: body.href,
  });

  let push = { attempted: 0, delivered: 0 };
  if (body.sendPush !== false) {
    push = await routePushToWorkspace(auth.workspaceId, {
      title: notification.title,
      body: notification.body,
      data: {
        notificationId: notification.id,
        href: notification.href ?? "/notifications",
      },
    });
  }

  return NextResponse.json({ success: true, notification, push });
}
