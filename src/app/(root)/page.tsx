"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
} from "lucide-react";
import { computeDashboardMetrics } from "@/lib/services/dashboard";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import InsightCards from "@/components/InsightCards";
import CashFlowForecastWidget from "@/components/CashFlowForecast";
import BudgetRecommendations from "@/components/BudgetRecommendations";
import SavingsGoalsWidget from "@/components/SavingsGoalsWidget";
import type {
  SpendingInsight,
  CashFlowForecast,
  BudgetRecommendation,
  Budget,
  Category,
  SavingsGoal,
  GoalProjection,
} from "@/lib/types";

export default function DashboardPage() {
  const metrics = computeDashboardMetrics(DEFAULT_WORKSPACE_ID);

  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [budgetRecs, setBudgetRecs] = useState<BudgetRecommendation[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [goalProjections, setGoalProjections] = useState<GoalProjection[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(
        `/api/ai/insights?workspaceId=${DEFAULT_WORKSPACE_ID}`
      );
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights ?? []);
      }
    } catch {
      // Silently fail — component shows empty state
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const res = await fetch(
        `/api/ai/forecast?workspaceId=${DEFAULT_WORKSPACE_ID}`
      );
      if (res.ok) {
        const data = await res.json();
        setForecast(data.forecast ?? null);
      }
    } catch {
      // Silently fail — component shows empty state
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    setBudgetsLoading(true);
    try {
      const [recRes, budRes] = await Promise.all([
        fetch(`/api/ai/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`),
        fetch(`/api/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`),
      ]);
      if (recRes.ok) {
        const data = await recRes.json();
        setBudgetRecs(data.recommendations ?? []);
      }
      if (budRes.ok) {
        const data = await budRes.json();
        setBudgets(data.budgets ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setBudgetsLoading(false);
    }
  }, []);

  const handleAcceptBudget = useCallback(
    async (category: Category, amount: number) => {
      try {
        const res = await fetch("/api/budgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: DEFAULT_WORKSPACE_ID,
            category,
            amount,
            source: "ai",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setBudgets((prev) => {
            const filtered = prev.filter((b) => b.category !== category);
            return [...filtered, data.budget];
          });
        }
      } catch {
        // Silently fail
      }
    },
    []
  );

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const [goalsRes, projRes] = await Promise.all([
        fetch(`/api/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`),
        fetch(`/api/ai/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`),
      ]);
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setSavingsGoals(data.goals ?? []);
      }
      if (projRes.ok) {
        const data = await projRes.json();
        setGoalProjections(data.projections ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    fetchForecast();
    fetchBudgets();
    fetchGoals();
  }, [fetchInsights, fetchForecast, fetchBudgets, fetchGoals]);

  const summaryCards = [
    {
      label: "Total Balance",
      value: formatCurrency(metrics.totalBalance),
      icon: Wallet,
      color: "text-arcana-sky",
    },
    {
      label: "Total Income",
      value: formatCurrency(metrics.totalIncome),
      icon: TrendingUp,
      color: "text-arcana-success",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(metrics.totalExpense),
      icon: TrendingDown,
      color: "text-arcana-danger",
    },
    {
      label: "Transaction Volume",
      value: formatCurrency(metrics.totalTransactionValue),
      icon: ArrowLeftRight,
      color: "text-arcana-warning",
    },
  ];
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, Alex</h1>
        <p className="text-sm text-slate-400 mt-1">
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-arcana-surface border border-arcana-border p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <InsightCards
        insights={insights}
        loading={insightsLoading}
        onRefresh={fetchInsights}
      />

      {/* Cash Flow Forecast */}
      <CashFlowForecastWidget
        data={forecast}
        loading={forecastLoading}
        onRefresh={fetchForecast}
      />

      {/* Budget Recommendations */}
      <BudgetRecommendations
        recommendations={budgetRecs}
        budgets={budgets}
        actualSpending={metrics.categoryBreakdown}
        loading={budgetsLoading}
        onRefresh={fetchBudgets}
        onAccept={handleAcceptBudget}
      />

      {/* Savings Goals */}
      <SavingsGoalsWidget
        goals={savingsGoals}
        projections={goalProjections}
        loading={goalsLoading}
        onRefresh={fetchGoals}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Distribution */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Account Distribution
          </h3>
          <div className="space-y-3">
            {metrics.accountDistribution.map((acct) => (
              <div key={acct.bankId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">
                    {acct.institutionName} (...{acct.displayMask})
                  </span>
                  <span className="text-white font-medium">
                    {formatCurrency(acct.balance)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-arcana-navy overflow-hidden">
                  <div
                    className="h-full rounded-full bg-arcana-blue"
                    style={{ width: `${acct.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Category Breakdown
          </h3>
          <div className="space-y-2">
            {metrics.categoryBreakdown.map((item) => (
              <div
                key={item.category}
                className="flex justify-between text-sm py-1.5 border-b border-arcana-border last:border-0"
              >
                <span className="text-slate-300">{item.label}</span>
                <span className="text-white font-medium">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Flow */}
      {metrics.monthlyFlow.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Monthly Cash Flow
          </h3>
          <div className="space-y-3">
            {metrics.monthlyFlow.map((m) => (
              <div
                key={m.month}
                className="flex items-center gap-4 text-sm"
              >
                <span className="w-20 text-slate-400 font-mono text-xs">
                  {m.month}
                </span>
                <div className="flex-1 flex gap-2 items-center">
                  <div className="flex-1 h-2 rounded-full bg-arcana-navy overflow-hidden">
                    <div
                      className="h-full rounded-full bg-arcana-success"
                      style={{
                        width: `${
                          (m.income / Math.max(m.income, m.expense, 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-arcana-success w-20 text-right">
                    +{formatCurrency(m.income)}
                  </span>
                </div>
                <div className="flex-1 flex gap-2 items-center">
                  <div className="flex-1 h-2 rounded-full bg-arcana-navy overflow-hidden">
                    <div
                      className="h-full rounded-full bg-arcana-danger"
                      style={{
                        width: `${
                          (m.expense / Math.max(m.income, m.expense, 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-arcana-danger w-20 text-right">
                    -{formatCurrency(m.expense)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary Card */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Financial Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-arcana-success">
              {(metrics.savingsRate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Savings Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-danger">
              {(metrics.spendingRate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Spending Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-sky">
              {metrics.accountCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Linked Accounts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-warning">
              {CATEGORY_LABELS[metrics.topCategory]}
            </p>
            <p className="text-xs text-slate-400 mt-1">Top Category</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Recent Transactions
          </h3>
          <a
            href="/transactions"
            className="text-xs text-arcana-sky hover:underline"
          >
            See all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-slate-400 text-left border-b border-arcana-border">
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentTransactions.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="border-b border-arcana-border last:border-0"
                >
                  <td className="py-2.5 text-white">{txn.title}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transactionType === "income"
                          ? "bg-green-500/10 text-arcana-success"
                          : txn.transactionType === "expense"
                          ? "bg-red-500/10 text-arcana-danger"
                          : "bg-blue-500/10 text-arcana-sky"
                      }`}
                    >
                      {txn.transactionType}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {CATEGORY_LABELS[txn.category]}
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td
                    className={`py-2.5 text-right font-medium ${
                      txn.transactionType === "income"
                        ? "text-arcana-success"
                        : "text-arcana-danger"
                    }`}
                  >
                    {txn.transactionType === "income" ? "+" : "-"}
                    {formatCurrency(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
