import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { getBankById } from "@/lib/services/banks";
import { insertSyncedTransaction } from "@/lib/services/transactions";
import type { Category } from "@/lib/types";

// Map Plaid personal_finance_category to our Category enum
function mapPlaidCategory(
  plaidCategory: string | undefined
): { category: Category; txnType: "income" | "expense" } {
  const cat = (plaidCategory ?? "").toUpperCase();

  // Income categories
  if (cat.includes("INCOME") || cat.includes("PAYROLL")) {
    return { category: "salary", txnType: "income" };
  }
  if (cat.includes("DIVIDEND") || cat.includes("INTEREST")) {
    return { category: "investment", txnType: "income" };
  }
  if (cat.includes("TRANSFER_IN") || cat.includes("DEPOSIT")) {
    return { category: "other_income", txnType: "income" };
  }

  // Expense categories
  if (cat.includes("RENT") || cat.includes("MORTGAGE")) {
    return { category: "housing", txnType: "expense" };
  }
  if (cat.includes("TRANSPORTATION") || cat.includes("GAS") || cat.includes("TAXI")) {
    return { category: "transportation", txnType: "expense" };
  }
  if (cat.includes("FOOD") || cat.includes("RESTAURANT") || cat.includes("GROCERY")) {
    return { category: "food", txnType: "expense" };
  }
  if (cat.includes("UTILITIES") || cat.includes("ELECTRIC") || cat.includes("WATER")) {
    return { category: "utilities", txnType: "expense" };
  }
  if (cat.includes("MEDICAL") || cat.includes("HEALTH") || cat.includes("PHARMACY")) {
    return { category: "healthcare", txnType: "expense" };
  }
  if (cat.includes("ENTERTAINMENT") || cat.includes("RECREATION")) {
    return { category: "entertainment", txnType: "expense" };
  }
  if (cat.includes("SHOPPING") || cat.includes("MERCHANDISE")) {
    return { category: "shopping", txnType: "expense" };
  }
  if (cat.includes("EDUCATION")) {
    return { category: "education", txnType: "expense" };
  }
  if (cat.includes("SUBSCRIPTION")) {
    return { category: "subscriptions", txnType: "expense" };
  }
  if (cat.includes("TRAVEL") || cat.includes("AIRLINE") || cat.includes("HOTEL")) {
    return { category: "travel", txnType: "expense" };
  }
  if (cat.includes("TRANSFER_OUT")) {
    return { category: "transfer", txnType: "expense" };
  }

  return { category: "other", txnType: "expense" };
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

    const bank = getBankById(bankId);
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

    // Map and insert each transaction
    const synced = plaidTransactions.map((pt) => {
      const primaryCategory =
        pt.personal_finance_category?.primary ?? pt.category?.[0] ?? "";
      const { category, txnType } = mapPlaidCategory(primaryCategory);

      // Plaid uses positive amounts for debits (expenses)
      const amount = Math.abs(pt.amount);
      const type = pt.amount < 0 ? "income" : txnType;

      return insertSyncedTransaction({
        workspaceId: bank.workspaceId,
        bankId: bank.bankId,
        transactionType: type,
        title: pt.name ?? pt.merchant_name ?? "Unknown",
        category: type === "income" && category === "other" ? "other_income" : category,
        amount,
        date: new Date(pt.date).toISOString(),
        externalReference: pt.transaction_id,
        note: pt.merchant_name ?? "",
      });
    });

    return NextResponse.json({
      synced: synced.length,
      total: plaidTransactions.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to sync transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
