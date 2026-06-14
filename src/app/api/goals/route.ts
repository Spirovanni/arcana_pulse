import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import {
  getGoalsByWorkspace,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/services/db/goals";
import { requireAuth } from "@/lib/auth/withAuth";
import type { GoalPriority, GoalStatus } from "@/lib/types";

const VALID_PRIORITIES: Set<string> = new Set(["low", "medium", "high"]);
const VALID_STATUSES: Set<string> = new Set(["active", "completed", "paused"]);

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const goals = await getGoalsByWorkspace(workspaceId);

    return NextResponse.json({ goals });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, targetAmount, targetDate, priority, monthlyContribution } =
      body as {
        name?: string;
        targetAmount?: number;
        targetDate?: string;
        priority?: string;
        monthlyContribution?: number;
      };

    if (!workspaceId || !name || targetAmount == null || !targetDate) {
      return NextResponse.json(
        { error: "workspaceId, name, targetAmount, and targetDate are required" },
        { status: 400 }
      );
    }

    if (typeof targetAmount !== "number" || targetAmount <= 0) {
      return NextResponse.json(
        { error: "targetAmount must be a positive number" },
        { status: 400 }
      );
    }

    if (priority && !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json(
        { error: `Invalid priority: ${priority}` },
        { status: 400 }
      );
    }

    const goal = await createGoal(
      workspaceId,
      name,
      targetAmount,
      targetDate,
      (priority as GoalPriority) ?? "medium",
      monthlyContribution ?? 0
    );

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { goalId, ...updates } = body as {
      goalId?: string;
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
      targetDate?: string;
      monthlyContribution?: number;
      priority?: string;
      status?: string;
    };

    if (!goalId) {
      return NextResponse.json(
        { error: "goalId is required" },
        { status: 400 }
      );
    }

    if (updates.priority && !VALID_PRIORITIES.has(updates.priority)) {
      return NextResponse.json(
        { error: `Invalid priority: ${updates.priority}` },
        { status: 400 }
      );
    }

    if (updates.status && !VALID_STATUSES.has(updates.status)) {
      return NextResponse.json(
        { error: `Invalid status: ${updates.status}` },
        { status: 400 }
      );
    }

    const { priority: rawPriority, status: rawStatus, ...rest } = updates;
    const typedUpdates: Parameters<typeof updateGoal>[1] = {
      ...rest,
      ...(rawPriority ? { priority: rawPriority as GoalPriority } : {}),
      ...(rawStatus ? { status: rawStatus as GoalStatus } : {}),
    };

    const goal = await updateGoal(goalId, typedUpdates);

    return NextResponse.json({ goal });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const goalId = request.nextUrl.searchParams.get("goalId");

    if (!goalId) {
      return NextResponse.json(
        { error: "goalId query parameter is required" },
        { status: 400 }
      );
    }

    await deleteGoal(goalId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
