import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { getBankById } from "@/lib/services/db/banks";
import { insertSyncedTransaction } from "@/lib/services/db/transactions";
import { categorizeBatch } from "@/lib/services/ai/categorize";
import type { CategorizationInput } from "@/lib/services/ai/categorize";

// Determine income vs expense from Plaid's category + amount sign
function inferTransactionType(
  plaidCategory: string | undefined,
  plaidAmount: number
): "income" | "expense" {
  const cat = (plaidCategory ?? "").toUpperCase();

  // Plaid: negative amount = credit/income
  if (plaidAmount < 0) return "income";

  // Check Plaid category hints for income
  if (
    cat.includes("INCOME") ||
    cat.includes("PAYROLL") ||
    cat.includes("DIVIDEND") ||
    cat.includes("INTEREST") ||
    cat.includes("TRANSFER_IN") ||
    cat.includes("DEPOSIT")
  ) {
    return "income";
  }

  return "expense";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankId } = body as { bankId: string };

    if (!bankId) {
      return NextResponse.json(
        { error: "bankId is required" },
        { status: 400 }
      );
    }

    const bank = await getBankById(bankId);
    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }
    if (!bank.accessTokenRef) {
      return NextResponse.json(
        { error: "Bank has no Plaid access token" },
        { status: 400 }
      );
    }

    // Fetch transactions from Plaid (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const response = await plaidClient.transactionsGet({
      access_token: bank.accessTokenRef,
      start_date: startDate,
      end_date: endDate,
      options: { count: 100, offset: 0 },
    });

    const plaidTransactions = response.data.transactions;

    // Prepare categorization inputs
    const catInputs: CategorizationInput[] = plaidTransactions.map((pt) => {
      const primaryCategory =
        pt.personal_finance_category?.primary ?? pt.category?.[0] ?? "";
      const txnType = inferTransactionType(primaryCategory, pt.amount);

      return {
        title: pt.name ?? pt.merchant_name ?? "Unknown",
        amount: Math.abs(pt.amount),
        transactionType: txnType,
      };
    });

    // Batch AI categorization
    const aiResults = await categorizeBatch(catInputs, bank.workspaceId);

    // Insert each transaction with AI-assigned category
    const insertions = plaidTransactions.map((pt, i) => {
      const input = catInputs[i];
      const aiResult = aiResults[i];

      return insertSyncedTransaction({
        workspaceId: bank.workspaceId,
        bankId: bank.bankId,
        transactionType: input.transactionType,
        title: input.title,
        category: aiResult.category,
        amount: input.amount,
        date: new Date(pt.date).toISOString(),
        externalReference: pt.transaction_id,
        note: pt.merchant_name ?? "",
        aiCategory: aiResult.category,
        aiConfidence: aiResult.confidence,
      });
    });

    const results = await Promise.all(insertions);

    return NextResponse.json({
      synced: results.length,
      total: plaidTransactions.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to sync transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
