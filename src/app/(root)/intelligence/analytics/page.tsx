"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Activity, Target, ShieldCheck, Flame, PieChart } from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { computeDashboardMetrics } from "@/lib/services/dashboard";
import CashFlowForecastWidget from "@/components/CashFlowForecast";
import BudgetRecommendations from "@/components/BudgetRecommendations";
import SavingsGoalsWidget from "@/components/SavingsGoalsWidget";
import InsightCards from "@/components/InsightCards";
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
} from "@/lib/types";

export default function AnalyticsPage() {
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
  const [insightsLastAnalysisAt, setInsightsLastAnalysisAt] = useState<string | null>(null);
  const [forecastLastAnalysisAt, setForecastLastAnalysisAt] = useState<string | null>(null);
  const [budgetsLastAnalysisAt, setBudgetsLastAnalysisAt] = useState<string | null>(null);
  const [goalsLastAnalysisAt, setGoalsLastAnalysisAt] = useState<string | null>(null);

  const fetchStaticData = useCallback(async (forceAnalysis = false) => {
    try {
      setInsightsLoading(true); setForecastLoading(true); setBudgetsLoading(true); setGoalsLoading(true);
      const forceParam = forceAnalysis ? "&force=true" : "";
      const [insRes, forRes, recRes, budRes, goalRes, projRes] = await Promise.all([
        fetch(`/api/ai/insights?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/ai/forecast?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/ai/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
        fetch(`/api/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`).catch(() => null),
        fetch(`/api/ai/goals?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`).catch(() => null),
      ]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-outline/30">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
               <PieChart className="size-5" />
            </span>
            <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Financial Analytics</h1>
          </div>
          <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
            Deep autonomous processing of your cash flow. Our intelligence layer maps trajectories, isolates wasteful habits, and recalibrates parameters constantly. No agenda but yours. 
          </p>
        </div>
        <div className="flex items-center gap-4">
          <LastAnalysisStamp
            lastAnalysisAt={latestAnalysisAt}
            className="text-[10px] uppercase tracking-[1.5px] text-secondary"
          />
          <div className="px-4 py-1.5 rounded-sm bg-green-500/5 text-arcana-success border border-green-500/20 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 relative overflow-hidden">
             <div className="size-1.5 rounded-full bg-arcana-success animate-pulse" />
             AI Engine Active
             <div className="absolute inset-0 bg-green-400/5 rounded-sm filter blur-md" />
          </div>
        </div>
      </header>

      {/* Main Insights Sub-Grid */}
      <div className="space-y-8">
         <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
            <Brain className="size-4 text-primary" /> Active Behavioral Analysis
         </h2>
         <div className="ml-4">
            <InsightCards insights={insights} loading={insightsLoading} onRefresh={refreshAnalyses} lastAnalysisAt={insightsLastAnalysisAt} />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
        {/* Trajectory */}
        <div className="space-y-8">
           <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
              <Activity className="size-4 text-primary" /> Core Forecasting Engine
           </h2>
           <div className="ml-4">
              <CashFlowForecastWidget data={forecast} loading={forecastLoading} onRefresh={refreshAnalyses} lastAnalysisAt={forecastLastAnalysisAt} />
           </div>
        </div>

        {/* Adjustments */}
        <div className="space-y-8">
           <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
              <ShieldCheck className="size-4 text-primary" /> Algorithmic Optimization
           </h2>
           <div className="ml-4">
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
        </div>
      </div>
      
      {/* Goals Assessment */}
      <div className="space-y-8 pt-8 pb-12">
           <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
              <Target className="size-4 text-primary" /> Strategy Projections
           </h2>
           <div className="ml-4">
             {/* Note: since the goal layout historically was smaller, we wrap it in a grid constraint for presentation */}
             <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <SavingsGoalsWidget 
                  goals={savingsGoals}
                  projections={goalProjections} 
                  loading={goalsLoading} 
                  onRefresh={refreshAnalyses}
                  lastAnalysisAt={goalsLastAnalysisAt}
                />
             </div>
           </div>
      </div>

    </div>
  );
}
