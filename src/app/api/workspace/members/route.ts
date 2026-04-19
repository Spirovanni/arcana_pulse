import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMembersByWorkspace,
  getInvitesByWorkspace,
  updateMemberRole,
  removeMember,
  revokeInvite,
  canManageRole,
  canRemoveMember,
} from "@/lib/services/members";
import type { UserRole } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";
  const members = getMembersByWorkspace(workspaceId);
  const invites = getInvitesByWorkspace(workspaceId).filter((i) => i.status === "pending");
  return NextResponse.json({ members, invites });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorRole = session.user.role;
  const body = await request.json() as { memberId: string; role: UserRole };
  const { memberId, role } = body;

  if (!memberId || !role) return NextResponse.json({ error: "memberId and role required" }, { status: 400 });
  if (!canManageRole(actorRole, role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  try {
    const member = updateMemberRole(memberId, role);
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorRole = session.user.role;
  const sp = request.nextUrl.searchParams;
  const memberId = sp.get("memberId");
  const inviteId = sp.get("inviteId");

  if (inviteId) {
    try {
      revokeInvite(inviteId);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Revoke failed" }, { status: 400 });
    }
  }

  if (memberId) {
    const workspaceId = sp.get("workspaceId") ?? "ws-001";
    const members = getMembersByWorkspace(workspaceId);
    const target = members.find((m) => m.memberId === memberId);
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (!canRemoveMember(actorRole, target.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    try {
      removeMember(memberId);
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Remove failed" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Provide memberId or inviteId" }, { status: 400 });
}
