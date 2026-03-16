import { NextRequest, NextResponse } from "next/server";
import { overrideCategory } from "@/lib/services/db/transactions";
import { isAppwriteConfigured } from "@/lib/appwrite";
import type { Category } from "@/lib/types";

const VALID_CATEGORIES: Category[] = [
  "salary", "freelance", "investment", "refund", "other_income",
  "housing", "transportation", "food", "utilities", "healthcare",
  "entertainment", "shopping", "education", "subscriptions", "travel",
  "transfer", "other",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const { transactionId } = await params;
    const body = await request.json();
    const { category } = body as { category?: string };

    if (!category || !VALID_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await overrideCategory(transactionId, category as Category);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to override category";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
