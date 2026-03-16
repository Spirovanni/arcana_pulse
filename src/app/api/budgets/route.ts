import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { getBudgetsByWorkspace, upsertBudget } from "@/lib/services/db/budgets";
import type { BudgetSource, Category } from "@/lib/types";

const VALID_CATEGORIES: Set<string> = new Set([
  "housing", "transportation", "food", "utilities", "healthcare",
  "entertainment", "shopping", "education", "subscriptions", "travel", "other",
]);

const VALID_SOURCES: Set<string> = new Set(["ai", "user"]);

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const workspaceId =
      request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

    const budgets = await getBudgetsByWorkspace(workspaceId);

    return NextResponse.json({ budgets });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch budgets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { workspaceId, category, amount, source } = body as {
      workspaceId?: string;
      category?: string;
      amount?: number;
      source?: string;
    };

    if (!workspaceId || !category || amount == null || !source) {
      return NextResponse.json(
        { error: "workspaceId, category, amount, and source are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: `Invalid category: ${category}` },
        { status: 400 }
      );
    }

    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json(
        { error: `Invalid source: ${source}` },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const budget = await upsertBudget(
      workspaceId,
      category as Category,
      amount,
      source as BudgetSource
    );

    return NextResponse.json({ budget });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
