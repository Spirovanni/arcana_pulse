"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Brain,
  Zap,
  Globe,
  Cpu,
  Wallet,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Cell,
  Tooltip
} from "recharts";
import { computeDashboardMetrics } from "@/lib/services/dashboard";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
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

  const fetchStaticData = useCallback(async () => {
    // We retain the fetch logic, wrapped gracefully for potential silent failures
    try {
      setInsightsLoading(true); setForecastLoading(true); setBudgetsLoading(true); setGoalsLoading(true);
      const [insRes, forRes, recRes, budRes, goalRes, projRes] = await Promise.all([
        fetch(`/api/ai/insights?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/forecast?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
      ]);

      if (insRes?.ok) { const d = await insRes.json(); setInsights(d.insights ?? []); }
      if (forRes?.ok) { const d = await forRes.json(); setForecast(d.forecast ?? null); }
      if (recRes?.ok) { const d = await recRes.json(); setBudgetRecs(d.recommendations ?? []); }
      if (budRes?.ok) { const d = await budRes.json(); setBudgets(d.budgets ?? []); }
      if (goalRes?.ok) { const d = await goalRes.json(); setSavingsGoals(d.goals ?? []); }
      if (projRes?.ok) { const d = await projRes.json(); setGoalProjections(d.projections ?? []); }
    } finally {
      setInsightsLoading(false); setForecastLoading(false); setBudgetsLoading(false); setGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  // Reformat MonthlyFlow into Recharts friendly format
  const chartData = metrics.monthlyFlow.map(m => ({ 
    month: m.month, 
    income: m.income, 
    expense: m.expense,
    val: Math.max(m.income - m.expense, 0)
  }));

  // Fallback visual data if sandbox is empty
  const visualChartData = chartData.length > 0 ? chartData : [
    { val: 30 }, { val: 45 }, { val: 40 }, { val: 60 }, { val: 55 }, { val: 75 }, { val: 90 }
  ];

  const savingsRateDisplay = Math.round(metrics.savingsRate * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="font-headline text-4xl lg:text-5xl font-light tracking-tight text-on-surface">Portfolio Summary</h1>
          <p className="text-secondary text-sm tracking-wide font-light">Welcome back. Your sovereign assets are performing above benchmark.</p>
        </div>
        <div className="flex items-center gap-12">
          <div className="space-y-1 text-right">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Total Value</div>
            <div className="text-2xl font-light text-primary">{formatCurrency(metrics.totalBalance)}</div>
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
              <h3 className="font-headline text-3xl font-light text-on-surface leading-tight max-w-sm">Cash Flow Yield Engine</h3>
            </div>
            <button className="px-6 py-2 border border-primary/30 text-primary text-[10px] uppercase tracking-[2px] hover:bg-primary hover:text-background transition-all">
              View Strategy
            </button>
          </div>

          <div className="h-40 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visualChartData}>
                <Tooltip 
                  cursor={{fill: '#1A1A1A'}} 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #222222', color: '#fff' }} 
                />
                <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                  {visualChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === visualChartData.length - 1 ? '#C5A059' : '#1A1A1A'} 
                      className="hover:fill-primary/70 transition-colors"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                    cx="50" cy="50" r="45" fill="none" stroke="#C5A059" strokeWidth="2" 
                    strokeDasharray="282.6" 
                    strokeDashoffset={282.6 - (282.6 * Math.max(savingsRateDisplay, 0) / 100)} 
                    strokeLinecap="square"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute font-headline text-3xl font-light text-on-surface">{savingsRateDisplay}</span>
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
           <InsightCards insights={insights} loading={insightsLoading} onRefresh={fetchStaticData} />
           <CashFlowForecastWidget data={forecast} loading={forecastLoading} onRefresh={fetchStaticData} />
        </div>

        {/* Vectors & Budgets Row */}
        <div className="lg:col-span-6 bg-surface-container rounded-sm border border-outline overflow-hidden">
          <BudgetRecommendations
            recommendations={budgetRecs}
            budgets={budgets}
            actualSpending={metrics.categoryBreakdown}
            loading={budgetsLoading}
            onRefresh={fetchStaticData}
            onAccept={async () => {}}
          />
        </div>

        <div className="lg:col-span-6 bg-surface-container rounded-sm border border-outline overflow-hidden">
          <SavingsGoalsWidget
            goals={savingsGoals}
            projections={goalProjections}
            loading={goalsLoading}
            onRefresh={fetchStaticData}
          />
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
                {metrics.recentTransactions.map((txn) => (
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
                      {new Date(txn.date).toLocaleDateString()}
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
