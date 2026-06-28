import type { WorkspacePlan } from "@/lib/types";
import * as DbWorkspace from "@/lib/services/db/workspace";
import * as MockWorkspace from "@/lib/services/workspace";

export async function resolveWorkspacePlan(
  workspaceId: string
): Promise<WorkspacePlan> {
  const dbWorkspace = await DbWorkspace.getWorkspace(workspaceId);
  if (dbWorkspace?.plan) return dbWorkspace.plan;

  const mockWorkspace = MockWorkspace.getWorkspace(workspaceId);
  return mockWorkspace?.plan ?? "starter";
}
