"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Brain,
  ArrowRight,
  DollarSign,
  Repeat2,
  Percent,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { getDividendSummary } from "@/lib/services/investments";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, cn, formatDate } from "@/lib/utils";
import InsightCards from "@/components/InsightCards";
import CashFlowForecastWidget from "@/components/CashFlowForecast";
import BudgetRecommendations from "@/components/BudgetRecommendations";
import SavingsGoalsWidget from "@/components/SavingsGoalsWidget";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";
import { notifyAiUsageUpdated } from "@/lib/aiUsageRefresh";
import type {
  SpendingInsight,
  CashFlowForecast,
  BudgetRecommendation,
  Budget,
  Category,
  SavingsGoal,
  GoalProjection,
  DashboardMetrics,
} from "@/lib/types";

export default function DashboardPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const divSummary = getDividendSummary(DEFAULT_WORKSPACE_ID); // kept as optional investment widget

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
  const [insightsLastAnalysisAt, setInsightsLastAnalysisAt] = useState<string | null>(null);
  const [forecastLastAnalysisAt, setForecastLastAnalysisAt] = useState<string | null>(null);
  const [budgetsLastAnalysisAt, setBudgetsLastAnalysisAt] = useState<string | null>(null);
  const [goalsLastAnalysisAt, setGoalsLastAnalysisAt] = useState<string | null>(null);

  const fetchStaticData = useCallback(async (forceAnalysis = false) => {
    // We retain the fetch logic, wrapped gracefully for potential silent failures
    try {
      setInsightsLoading(true); setForecastLoading(true); setBudgetsLoading(true); setGoalsLoading(true);
      setDashboardLoading(true);
      const forceParam = forceAnalysis ? "&force=true" : "";
      const [dashRes, insRes, forRes, recRes, budRes, goalRes, projRes] = await Promise.all([
        fetch(`/api/dashboard?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/insights?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/ai/forecast?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/ai/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/goals?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
      ]);

      if (dashRes?.ok) {
        const d = await dashRes.json();
        setDashboardMetrics(d as DashboardMetrics);
      }

      if (insRes?.ok) {
        const d = await insRes.json();
        setInsights(d.insights ?? []);
        setInsightsLastAnalysisAt(d.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
      if (forRes?.ok) {
        const d = await forRes.json();
        setForecast(d.forecast ?? null);
        setForecastLastAnalysisAt(d.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
      if (recRes?.ok) {
        const d = await recRes.json();
        setBudgetRecs(d.recommendations ?? []);
        setBudgetsLastAnalysisAt(d.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
      if (budRes?.ok) { const d = await budRes.json(); setBudgets(d.budgets ?? []); }
      if (goalRes?.ok) { const d = await goalRes.json(); setSavingsGoals(d.goals ?? []); }
      if (projRes?.ok) {
        const d = await projRes.json();
        setGoalProjections(d.projections ?? []);
        setGoalsLastAnalysisAt(d.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
    } finally {
      setDashboardLoading(false);
      setInsightsLoading(false); setForecastLoading(false); setBudgetsLoading(false); setGoalsLoading(false);
    }
  }, []);

  const refreshAnalyses = useCallback(() => {
    void fetchStaticData(true);
  }, [fetchStaticData]);

  useEffect(() => {
    void fetchStaticData(false);
  }, [fetchStaticData]);

  const latestAnalysisAt =
    [insightsLastAnalysisAt, forecastLastAnalysisAt, budgetsLastAnalysisAt, goalsLastAnalysisAt]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const emptyMetrics: DashboardMetrics = {
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    totalTransactionValue: 0,
    savingsRate: 0,
    spendingRate: 0,
    topCategory: "other" as Category,
    accountCount: 0,
    recentTransactions: [],
    categoryBreakdown: [],
    accountDistribution: [],
    monthlyFlow: [],
  };
  const metrics = dashboardMetrics ?? emptyMetrics;
  const chartData = metrics.monthlyFlow.map((m) => ({
    month: formatDate(`${m.month}-01`).slice(0, 3),
    income: m.income,
    expense: m.expense,
    net: m.income - m.expense,
  }));

  const savingsRateDisplay = Math.round(metrics.savingsRate * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="font-headline text-4xl lg:text-5xl font-light tracking-tight text-on-surface">Portfolio Summary</h1>
          <p className="text-secondary text-sm tracking-wide font-light">
            Live dashboard metrics sourced from uploaded statements, synced accounts, and recorded transactions.
          </p>
          <LastAnalysisStamp
            lastAnalysisAt={latestAnalysisAt}
            className="block text-[10px] uppercase tracking-[1.5px] text-secondary"
          />
        </div>
        <div className="flex items-center gap-12">
          <div className="space-y-1 text-right">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Total Value</div>
            <div className="text-2xl font-light text-primary">
              {dashboardLoading ? "Loading..." : formatCurrency(metrics.totalBalance)}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">MoM Growth</div>
            <div className="text-2xl font-light text-primary">{savingsRateDisplay > 0 ? `+${savingsRateDisplay}%` : `${savingsRateDisplay}%`}</div>
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Metric Card: Cash Flow Optimization */}
        <div className="lg:col-span-8 bg-surface-container rounded-sm p-10 border border-outline relative overflow-hidden group">
          <div className="absolute -right-20 -bottom-20 size-80 border border-primary/5 rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-start mb-12 relative z-10">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[9px] uppercase tracking-[3px] border border-primary/10 rounded-sm">Monthly Net Velocity</div>
              <h3 className="font-headline text-3xl font-light text-on-surface leading-tight max-w-sm">Cash Flow Trend</h3>
            </div>
            <span className="px-4 py-2 border border-primary/20 text-primary text-[10px] uppercase tracking-[2px]">
              Real Data
            </span>
          </div>

          <div className="h-56 w-full relative z-10 -ml-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-secondary text-sm pl-4">
                No uploaded transaction history yet. Upload a statement or sync an account to render this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--color-primary-container)" stopOpacity={0.15} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-secondary)', fontSize: 10, fontWeight: 500, letterSpacing: '1px' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-secondary)', fontSize: 10, fontWeight: 500 }} 
                  tickFormatter={(val) => `$${val}`}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{fill: 'var(--color-surface-container-highest)', opacity: 0.4}} 
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 18, 0.85)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--color-outline-variant)', 
                    borderRadius: '4px',
                    color: 'var(--color-on-surface)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                  }} 
                  itemStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
                  formatter={(value, name) => [formatCurrency(Number(value)), name === "income" ? "Income" : "Expense"]}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--color-primary)"
                  fill="url(#incomeGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#f87171"
                  fill="url(#expenseGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alignment Score Card */}
        <div className="lg:col-span-4 bg-surface-container rounded-sm p-10 border border-outline flex flex-col justify-between">
          <div className="space-y-8">
            <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Financial Alignment</h3>
            <div className="flex items-center gap-8">
              <div className="relative size-24 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1A1A1A" strokeWidth="2" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="url(#goldStroke)" strokeWidth="2.5" 
                    strokeDasharray="282.6" 
                    strokeDashoffset={282.6 - (282.6 * Math.max(savingsRateDisplay, 0) / 100)} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 origin-center"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(197,160,89,0.3))' }}
                  />
                  <defs>
                    <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-tertiary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 bg-primary/5 rounded-full filter blur-xl" />
                <span className="absolute font-headline text-3xl font-light text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container drop-shadow-md">{savingsRateDisplay}</span>
              </div>
              <p className="text-xs text-secondary font-light leading-relaxed tracking-wide">Strategic alignment with core intelligence parameters.</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-outline/50">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-widest mb-4">
              <span className="text-secondary font-bold">Spend Velocity</span>
              <span className="text-primary font-bold">{Math.round(metrics.spendingRate * 100)}%</span>
            </div>
            <div className="w-full bg-outline/20 h-px">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(metrics.spendingRate * 100, 100)}%` }}
                transition={{ duration: 1.5 }}
                className="bg-primary h-px" 
              />
            </div>
          </div>
        </div>

        {/* Intelligence Models */}
        <div className="lg:col-span-12 mt-4 space-y-6">
           <h3 className="font-sans text-primary uppercase tracking-[3px] text-[10px] font-bold flex items-center gap-2">
             <Brain className="size-4" />
             Sovereign Intel Modules
           </h3>
           <InsightCards insights={insights} loading={insightsLoading} onRefresh={refreshAnalyses} lastAnalysisAt={insightsLastAnalysisAt} />
           <CashFlowForecastWidget data={forecast} loading={forecastLoading} onRefresh={refreshAnalyses} lastAnalysisAt={forecastLastAnalysisAt} />
        </div>

        {/* Vectors & Budgets Row */}
        <div className="lg:col-span-6 bg-surface-container rounded-sm border border-outline p-8">
          <BudgetRecommendations
            recommendations={budgetRecs}
            budgets={budgets}
            actualSpending={metrics.categoryBreakdown}
            loading={budgetsLoading}
            onRefresh={refreshAnalyses}
            onAccept={async () => {}}
            lastAnalysisAt={budgetsLastAnalysisAt}
          />
        </div>

        <div className="lg:col-span-6 bg-surface-container rounded-sm border border-outline p-8">
          <SavingsGoalsWidget
            goals={savingsGoals}
            projections={goalProjections}
            loading={goalsLoading}
            onRefresh={refreshAnalyses}
            lastAnalysisAt={goalsLastAnalysisAt}
          />
        </div>
        
        {/* Investment Income Widget */}
        <div className="lg:col-span-12 bg-surface-container rounded-sm border border-outline p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[9px] uppercase tracking-[3px] border border-primary/10 rounded-sm mb-1">Passive Income</div>
              <h3 className="font-sans text-on-surface font-light text-lg tracking-tight">Investment Income</h3>
            </div>
            <a href="/income" className="text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors flex items-center gap-1.5">
              View Details <ArrowRight className="size-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { Icon: DollarSign, label: "Received YTD",     value: formatCurrency(divSummary.totalReceivedYTD),  color: "text-green-400" },
              { Icon: TrendingUp, label: "Projected Annual", value: formatCurrency(divSummary.projectedAnnual),   color: "text-blue-400"  },
              { Icon: Percent,    label: "Portfolio Yield",  value: `${divSummary.portfolioYield.toFixed(2)}%`,   color: "text-primary"   },
              { Icon: Repeat2,    label: "DRIP Tickers",     value: divSummary.dripTickers.length > 0 ? divSummary.dripTickers.join(", ") : "None", color: "text-teal-400" },
            ].map(({ Icon, label, value, color }) => (
              <div key={label} className="bg-background/40 border border-outline/50 rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`size-3.5 ${color}`} />
                  <span className="text-[9px] uppercase tracking-[2px] text-secondary">{label}</span>
                </div>
                <p className={`text-lg font-light ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary/60 font-bold mb-3">Top Dividend Payers (LTM)</div>
            {divSummary.byTicker.slice(0, 4).map((t) => (
              <div key={t.ticker} className="flex items-center gap-4">
                <span className="font-mono font-bold text-[11px] text-on-surface w-14 shrink-0">{t.ticker}</span>
                <div className="flex-1 h-1 bg-outline/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${t.pct}%` }} />
                </div>
                <span className="text-[11px] text-secondary w-16 text-right tabular-nums">{formatCurrency(t.amount)}</span>
                <span className="text-[10px] text-secondary/50 w-10 text-right tabular-nums">{t.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Matrix */}
        <div className="lg:col-span-12 mt-8 bg-surface-container rounded-sm border border-outline p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <div className="inline-block px-3 py-1 bg-outline text-secondary text-[8px] uppercase tracking-[3px] rounded-sm mb-2">Ledger Feed</div>
              <h3 className="font-headline text-2xl font-light text-on-surface">Recent Transactions</h3>
            </div>
            <a href="/transactions" className="text-[10px] text-primary uppercase tracking-[2px] border-b border-primary/30 hover:border-primary pb-1 transition-colors">
              Access Full Log
            </a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-secondary text-left border-b border-outline/50 text-[10px] uppercase tracking-[2px]">
                  <th className="pb-4 font-normal pl-4">Signature</th>
                  <th className="pb-4 font-normal">State</th>
                  <th className="pb-4 font-normal">Category</th>
                  <th className="pb-4 font-normal">Timestamp</th>
                  <th className="pb-4 font-normal text-right pr-4">Value</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-secondary/70 text-sm">
                      No transactions from uploaded statements or synced accounts yet.
                    </td>
                  </tr>
                ) : metrics.recentTransactions.map((txn) => (
                  <tr
                    key={txn.transactionId}
                    className="border-b border-outline/20 last:border-0 hover:bg-outline/10 transition-colors group"
                  >
                    <td className="py-4 text-on-surface pl-4 font-medium">{txn.title}</td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold border",
                        txn.transactionType === "income" ? "border-green-500/20 text-green-500 bg-green-500/5" :
                        txn.transactionType === "expense" ? "border-[var(--color-primary)]/20 text-[var(--color-primary)] bg-[var(--color-primary)]/5" :
                        "border-blue-500/20 text-blue-500 bg-blue-500/5"
                      )}>
                        {txn.transactionType}
                      </span>
                    </td>
                    <td className="py-4 text-secondary/80 text-xs">
                      {CATEGORY_LABELS[txn.category] || txn.category}
                    </td>
                    <td className="py-4 text-secondary/60 text-xs font-mono">
                      {formatDate(txn.date)}
                    </td>
                    <td className={cn(
                      "py-4 text-right pr-4 font-mono text-sm",
                      txn.transactionType === "income" ? "text-green-500" : "text-on-surface"
                    )}>
                      {txn.transactionType === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
