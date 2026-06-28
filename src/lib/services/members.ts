import type { WorkspaceMember, WorkspaceInvite, UserRole, InviteStatus } from "@/lib/types";
import { generateId } from "@/lib/utils";

// ─── In-memory stores ────────────────────────────────────────────────────────

let members: WorkspaceMember[] = [];
let invites: WorkspaceInvite[] = [];

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

export function ensureWorkspaceOwnerMember(input: {
  workspaceId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}): WorkspaceMember {
  const existing = members.find(
    (m) => m.workspaceId === input.workspaceId && m.userId === input.userId
  );
  if (existing) return { ...existing };

  const member: WorkspaceMember = {
    memberId: generateId("mem"),
    workspaceId: input.workspaceId,
    userId: input.userId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    joinedAt: new Date().toISOString(),
  };
  members.push(member);
  return { ...member };
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
