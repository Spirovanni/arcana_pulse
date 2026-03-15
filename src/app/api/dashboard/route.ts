import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbBanks from "@/lib/services/db/banks";
import * as dbTransactions from "@/lib/services/db/transactions";
import type { DashboardMetrics, AccountDistribution } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const workspaceId =
    request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

  const [
    banks,
    totalBalance,
    totalIncome,
    totalExpense,
    txnValue,
    topCategory,
    recentTransactions,
    categoryBreakdown,
    monthlyFlow,
  ] = await Promise.all([
    dbBanks.getBanksByWorkspace(workspaceId),
    dbBanks.getTotalBalance(workspaceId),
    dbTransactions.sumByType(workspaceId, "income"),
    dbTransactions.sumByType(workspaceId, "expense"),
    dbTransactions.totalTransactionValue(workspaceId),
    dbTransactions.getTopCategory(workspaceId),
    dbTransactions.getRecentTransactions(workspaceId, 5),
    dbTransactions.getCategoryBreakdown(workspaceId, "expense"),
    dbTransactions.getMonthlyFlow(workspaceId),
  ]);

  const netIncome = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, netIncome / totalIncome) : 0;
  const spendingRate =
    totalIncome > 0 ? Math.min(1, totalExpense / totalIncome) : 0;

  const accountDistribution: AccountDistribution[] = banks.map((b) => ({
    bankId: b.bankId,
    institutionName: b.institutionName,
    displayMask: b.displayMask,
    balance: b.balance,
    percentage: totalBalance > 0 ? (b.balance / totalBalance) * 100 : 0,
  }));

  const metrics: DashboardMetrics = {
    totalBalance,
    totalIncome,
    totalExpense,
    totalTransactionValue: txnValue,
    savingsRate,
    spendingRate,
    topCategory,
    accountCount: banks.length,
    recentTransactions,
    categoryBreakdown,
    accountDistribution,
    monthlyFlow,
  };

  return NextResponse.json(metrics);
}
