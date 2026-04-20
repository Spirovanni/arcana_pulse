"use client";

import { useMemo } from "react";
import { getWorkspace, DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import type { WorkspacePlan } from "@/lib/types";

const PLAN_RANK: Record<WorkspacePlan, number> = { starter: 0, pro: 1, team: 2 };

/**
 * Returns whether the current workspace meets the minimum required plan.
 * Also exposes the current plan for display purposes.
 */
export function usePlanGate(required: WorkspacePlan): {
  allowed: boolean;
  currentPlan: WorkspacePlan;
} {
  const workspace = getWorkspace(DEFAULT_WORKSPACE_ID);
  const currentPlan: WorkspacePlan = workspace?.plan ?? "starter";

  const allowed = useMemo(
    () => PLAN_RANK[currentPlan] >= PLAN_RANK[required],
    [currentPlan, required]
  );

  return { allowed, currentPlan };
}
