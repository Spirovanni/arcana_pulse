import type { DashboardMetrics, AccountDistribution } from "@/lib/types";
import { getBanksByWorkspace, getTotalBalance } from "./workspace";
import {
  sumByType,
  totalTransactionValue,
  getTopCategory,
  getRecentTransactions,
  getCategoryBreakdown,
  getMonthlyFlow,
} from "./transactions";

export function computeDashboardMetrics(
  workspaceId: string
): DashboardMetrics {
  const banks = getBanksByWorkspace(workspaceId);
  const totalBalance = getTotalBalance(workspaceId);
  const totalIncome = sumByType(workspaceId, "income");
  const totalExpense = sumByType(workspaceId, "expense");
  const txnValue = totalTransactionValue(workspaceId);
  const netIncome = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, netIncome / totalIncome) : 0;
  const spendingRate = totalIncome > 0 ? Math.min(1, totalExpense / totalIncome) : 0;

  const accountDistribution: AccountDistribution[] = banks.map((b) => ({
    bankId: b.bankId,
    institutionName: b.institutionName,
    displayMask: b.displayMask,
    balance: b.balance,
    percentage: totalBalance > 0 ? (b.balance / totalBalance) * 100 : 0,
  }));

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    totalTransactionValue: txnValue,
    savingsRate,
    spendingRate,
    topCategory: getTopCategory(workspaceId),
    accountCount: banks.length,
    recentTransactions: getRecentTransactions(workspaceId, 5),
    categoryBreakdown: getCategoryBreakdown(workspaceId, "expense"),
    accountDistribution,
    monthlyFlow: getMonthlyFlow(workspaceId),
  };
}
