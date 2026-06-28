"use client";

import { PieChart, CheckCircle2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { BudgetRecommendation, Budget, CategoryBreakdown, Category } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";

interface BudgetRecommendationsProps {
  recommendations: BudgetRecommendation[];
  budgets: Budget[];
  actualSpending: CategoryBreakdown[];
  loading: boolean;
  onRefresh: () => void;
  onAccept: (category: Category, amount: number) => void;
  lastAnalysisAt: string | null;
}

function getStatus(actual: number, limit: number): { label: string; color: string; barColor: string } {
  const pct = limit > 0 ? (actual / limit) * 100 : 0;
  if (pct >= 100) return { label: "Over", color: "text-arcana-danger", barColor: "bg-gradient-to-r from-arcana-danger/80 to-arcana-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" };
  if (pct >= 75) return { label: "Warning", color: "text-arcana-warning", barColor: "bg-gradient-to-r from-arcana-warning/80 to-arcana-warning drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" };
  return { label: "On track", color: "text-arcana-success", barColor: "bg-gradient-to-r from-arcana-success/80 to-arcana-success drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" };
}

export default function BudgetRecommendations({
  recommendations,
  budgets,
  actualSpending,
  loading,
  onRefresh,
  onAccept,
  lastAnalysisAt,
}: BudgetRecommendationsProps) {
  const budgetMap = new Map(budgets.map((b) => [b.category, b]));
  const spendingMap = new Map(actualSpending.map((s) => [s.category, s]));

  const categories = new Set<string>();
  budgets.forEach((b) => categories.add(b.category));
  recommendations.forEach((r) => categories.add(r.category));

  const sortedCategories = Array.from(categories).sort((a, b) => {
    const aSpend = spendingMap.get(a as Category)?.amount ?? 0;
    const bSpend = spendingMap.get(b as Category)?.amount ?? 0;
    return bSpend - aSpend;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-[2px] text-secondary font-bold">Budget Vectors</span>
            <LastAnalysisStamp lastAnalysisAt={lastAnalysisAt} />
          </div>
          <a href="/budgets" className="text-[9px] uppercase tracking-[1px] text-primary/60 hover:text-primary transition-colors">
            All →
          </a>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] text-secondary hover:text-primary transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && sortedCategories.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-secondary uppercase tracking-wider">Computing recommendations...</span>
          </div>
        </div>
      )}

      {!loading && sortedCategories.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center">
          <PieChart className="w-5 h-5 text-secondary mx-auto mb-2" />
          <p className="text-xs text-secondary uppercase tracking-wider">
            {lastAnalysisAt ? "No budget data yet" : "No analysis yet. Click refresh to run."}
          </p>
        </div>
      )}

      {sortedCategories.length > 0 && (
        <div className="space-y-5">
          {sortedCategories.slice(0, 8).map((cat) => {
            const category = cat as Category;
            const budget = budgetMap.get(category);
            const recommendation = recommendations.find((r) => r.category === category);
            const spending = spendingMap.get(category);
            const actual = spending?.amount ?? 0;
            const limit = budget?.amount ?? recommendation?.recommendedAmount ?? 0;
            const pct = limit > 0 ? Math.min((actual / limit) * 100, 100) : 0;
            const status = getStatus(actual, limit);
            const hasBudget = !!budget;

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface font-medium">
                      {CATEGORY_LABELS[category] ?? cat}
                    </span>
                    {hasBudget ? (
                      <CheckCircle2 className="w-3 h-3 text-arcana-success" />
                    ) : (
                      <span className="text-[9px] text-secondary uppercase tracking-wider">AI</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] uppercase tracking-wider font-bold ${status.color}`}>
                      {status.label}
                    </span>
                    {!hasBudget && recommendation && (
                      <button
                        type="button"
                        onClick={() => onAccept(category, recommendation.recommendedAmount)}
                        className="text-[9px] uppercase tracking-wider px-2 py-0.5 border border-primary/30 text-primary hover:bg-primary hover:text-background transition-all"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </div>

                <ProgressBar value={pct} colorClass={status.barColor} className="mb-2" />

                <div className="flex justify-between text-[9px] text-secondary font-mono uppercase tracking-wider">
                  <span>{formatCurrency(actual)} spent</span>
                  <span>
                    {formatCurrency(limit)} limit
                    {recommendation && !hasBudget && (
                      <span className="ml-1 opacity-60">({recommendation.percentOfIncome}% income)</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
