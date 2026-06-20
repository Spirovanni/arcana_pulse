import type { Workspace, User, WorkspacePlan } from "@/lib/types";
import { mockWorkspace, mockUser } from "@/lib/mock/data";

// Re-export bank operations from dedicated bank service
export { getBanksByWorkspace, getBankById, getTotalBalance } from "./banks";

// ─── In-memory store (mock persistence) ─────────────────────────────
// Structured for future replacement with Appwrite SDK calls.

let workspace: Workspace = { ...mockWorkspace };
let user: User = { ...mockUser };

// ─── Workspace operations ───────────────────────────────────────────

export function getWorkspace(workspaceId: string): Workspace | null {
  return workspace.workspaceId === workspaceId ? { ...workspace } : null;
}

export function updateWorkspace(
  workspaceId: string,
  updates: { name?: string; plan?: WorkspacePlan; tradingPaused?: boolean }
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

// ─── Default workspace ID ───────────────────────────────────────────

export const DEFAULT_WORKSPACE_ID = mockWorkspace.workspaceId;
