import type { WorkspaceMember, WorkspaceInvite, UserRole, InviteStatus } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { mockUser } from "@/lib/mock/data";

// ─── In-memory stores ────────────────────────────────────────────────────────

let members: WorkspaceMember[] = [
  {
    memberId: "mem-001",
    workspaceId: "ws-001",
    userId: mockUser.userId,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    role: "owner",
    joinedAt: mockUser.createdAt,
  },
  {
    memberId: "mem-002",
    workspaceId: "ws-001",
    userId: "usr-002",
    email: "partner@example.com",
    firstName: "Alex",
    lastName: "Rivera",
    role: "admin",
    joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    memberId: "mem-003",
    workspaceId: "ws-001",
    userId: "usr-003",
    email: "child@example.com",
    firstName: "Jordan",
    lastName: "Rivera",
    role: "viewer",
    joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let invites: WorkspaceInvite[] = [
  {
    inviteId: "inv-001",
    workspaceId: "ws-001",
    invitedByUserId: mockUser.userId,
    email: "pending@example.com",
    role: "member",
    token: "demo-token-pending",
    status: "pending",
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Permission matrix ────────────────────────────────────────────────────────

const ROLE_RANK: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export function canInvite(role: UserRole): boolean {
  return role === "owner" || role === "admin";
}

export function canRemoveMember(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === "owner") return false;
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

// ─── Member operations ────────────────────────────────────────────────────────

export function getMembersByWorkspace(workspaceId: string): WorkspaceMember[] {
  return members.filter((m) => m.workspaceId === workspaceId);
}

export function updateMemberRole(memberId: string, role: UserRole): WorkspaceMember {
  const m = members.find((m) => m.memberId === memberId);
  if (!m) throw new Error("Member not found");
  if (m.role === "owner") throw new Error("Cannot change the owner role");
  m.role = role;
  return { ...m };
}

export function removeMember(memberId: string): void {
  const m = members.find((m) => m.memberId === memberId);
  if (!m) throw new Error("Member not found");
  if (m.role === "owner") throw new Error("Cannot remove the workspace owner");
  members = members.filter((m) => m.memberId !== memberId);
}

// ─── Invite operations ────────────────────────────────────────────────────────

export function getInvitesByWorkspace(workspaceId: string): WorkspaceInvite[] {
  return invites.filter((i) => i.workspaceId === workspaceId);
}

export function createInvite(
  workspaceId: string,
  invitedByUserId: string,
  email: string,
  role: UserRole
): WorkspaceInvite {
  // Revoke any existing pending invite for this email
  invites = invites.map((i) =>
    i.workspaceId === workspaceId && i.email === email && i.status === "pending"
      ? { ...i, status: "revoked" as InviteStatus }
      : i
  );

  const invite: WorkspaceInvite = {
    inviteId: generateId("inv"),
    workspaceId,
    invitedByUserId,
    email,
    role,
    token: generateId("tok"),
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  invites.push(invite);
  return invite;
}

export function revokeInvite(inviteId: string): void {
  const invite = invites.find((i) => i.inviteId === inviteId);
  if (!invite) throw new Error("Invite not found");
  invite.status = "revoked";
}

export function acceptInvite(token: string, userId: string, firstName: string, lastName: string, email: string): WorkspaceMember {
  const invite = invites.find((i) => i.token === token && i.status === "pending");
  if (!invite) throw new Error("Invalid or expired invite");
  if (new Date(invite.expiresAt) < new Date()) {
    invite.status = "expired";
    throw new Error("This invite has expired");
  }

  invite.status = "accepted";

  const member: WorkspaceMember = {
    memberId: generateId("mem"),
    workspaceId: invite.workspaceId,
    userId,
    email,
    firstName,
    lastName,
    role: invite.role,
    joinedAt: new Date().toISOString(),
  };
  members.push(member);
  return member;
}
