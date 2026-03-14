import type { Workspace, User, Bank, WorkspacePlan } from "@/lib/types";
import { mockWorkspace, mockUser, mockBanks } from "@/lib/mock/data";

// ─── In-memory store (mock persistence) ─────────────────────────────
// Structured for future replacement with Appwrite SDK calls.

let workspace: Workspace = { ...mockWorkspace };
let user: User = { ...mockUser };
let banks: Bank[] = [...mockBanks];

// ─── Workspace operations ───────────────────────────────────────────

export function getWorkspace(workspaceId: string): Workspace | null {
  return workspace.workspaceId === workspaceId ? { ...workspace } : null;
}

export function updateWorkspace(
  workspaceId: string,
  updates: { name?: string; plan?: WorkspacePlan }
): Workspace {
  if (workspace.workspaceId !== workspaceId) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }
  workspace = {
    ...workspace,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return { ...workspace };
}

// ─── User operations ────────────────────────────────────────────────

export function getCurrentUser(): User {
  return { ...user };
}

export function getUserByWorkspace(workspaceId: string): User | null {
  return user.workspaceId === workspaceId ? { ...user } : null;
}

// ─── Bank operations ────────────────────────────────────────────────

export function getBanksByWorkspace(workspaceId: string): Bank[] {
  return banks
    .filter((b) => b.workspaceId === workspaceId)
    .map((b) => ({ ...b }));
}

export function getBankById(bankId: string): Bank | null {
  const bank = banks.find((b) => b.bankId === bankId);
  return bank ? { ...bank } : null;
}

export function getTotalBalance(workspaceId: string): number {
  return banks
    .filter((b) => b.workspaceId === workspaceId)
    .reduce((sum, b) => sum + b.balance, 0);
}

// ─── Default workspace ID ───────────────────────────────────────────

export const DEFAULT_WORKSPACE_ID = mockWorkspace.workspaceId;
