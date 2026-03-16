import { NextRequest, NextResponse } from "next/server";
import { categorizeTransaction } from "@/lib/services/ai/categorize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, amount, transactionType, workspaceId } = body as {
      title?: string;
      amount?: number;
      transactionType?: "income" | "expense";
      workspaceId?: string;
    };

    if (!title || amount == null || !transactionType) {
      return NextResponse.json(
        { error: "title, amount, and transactionType are required" },
        { status: 400 }
      );
    }

    if (transactionType !== "income" && transactionType !== "expense") {
      return NextResponse.json(
        { error: "transactionType must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    const result = await categorizeTransaction(
      { title, amount, transactionType },
      workspaceId
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Categorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
