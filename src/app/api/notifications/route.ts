import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  markRead,
  markAllRead,
} from "@/lib/services/notifications";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";
  const notifications = getNotifications(workspaceId);
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json() as { id?: string; all?: boolean; workspaceId?: string };

  if (body.all) {
    markAllRead(body.workspaceId ?? "ws-001");
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    markRead(body.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or all:true" }, { status: 400 });
}
