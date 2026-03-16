"use client";

import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Target,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type {
  BudgetRecommendation,
  Budget,
  CategoryBreakdown,
  Category,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetRecommendationsProps {
  recommendations: BudgetRecommendation[];
  budgets: Budget[];
  actualSpending: CategoryBreakdown[];
  loading: boolean;
  onRefresh: () => void;
  onAccept: (category: Category, amount: number) => void;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatus(
  actual: number,
  limit: number
): { label: string; color: string; bgColor: string } {
  const pct = limit > 0 ? (actual / limit) * 100 : 0;
  if (pct >= 100) {
    return {
      label: "Over budget",
      color: "text-arcana-danger",
      bgColor: "bg-arcana-danger",
    };
  }
  if (pct >= 75) {
    return {
      label: "Warning",
      color: "text-arcana-warning",
      bgColor: "bg-arcana-warning",
    };
  }
  return {
    label: "On track",
    color: "text-arcana-success",
    bgColor: "bg-arcana-success",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BudgetRecommendations({
  recommendations,
  budgets,
  actualSpending,
  loading,
  onRefresh,
  onAccept,
}: BudgetRecommendationsProps) {
  // Build lookup maps
  const budgetMap = new Map(budgets.map((b) => [b.category, b]));
  const spendingMap = new Map(actualSpending.map((s) => [s.category, s]));

  // Merge: categories with either a stored budget or an AI recommendation
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            Budget Recommendations
          </h3>
          <a
            href="/budgets"
            className="text-xs text-arcana-sky hover:underline"
          >
            See all
          </a>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-arcana-sky hover:bg-arcana-navy transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && sortedCategories.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-arcana-sky animate-spin" />
            <span className="text-sm text-slate-400">
              Generating budget recommendations...
            </span>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && sortedCategories.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <PieChart className="w-6 h-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            No budget data available. Add transactions to get personalized
            recommendations.
          </p>
        </div>
      )}

      {/* Budget cards */}
      {sortedCategories.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <div className="space-y-4">
            {sortedCategories.slice(0, 8).map((cat) => {
              const category = cat as Category;
              const budget = budgetMap.get(category);
              const recommendation = recommendations.find(
                (r) => r.category === category
              );
              const spending = spendingMap.get(category);
              const actual = spending?.amount ?? 0;
              const limit = budget?.amount ?? recommendation?.recommendedAmount ?? 0;
              const pct = limit > 0 ? Math.min((actual / limit) * 100, 100) : 0;
              const status = getStatus(actual, limit);
              const hasBudget = !!budget;

              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">
                        {CATEGORY_LABELS[category] ?? cat}
                      </span>
                      {hasBudget ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-arcana-success" />
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          AI suggested
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {!hasBudget && recommendation && (
                        <button
                          onClick={() =>
                            onAccept(category, recommendation.recommendedAmount)
                          }
                          className="text-xs px-2 py-0.5 rounded bg-arcana-blue/20 text-arcana-blue hover:bg-arcana-blue/30 transition-colors"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-arcana-navy overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${status.bgColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Values */}
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      {formatCurrency(actual)} spent
                    </span>
                    <span>
                      {formatCurrency(limit)} budget
                      {recommendation && !hasBudget && (
                        <span className="ml-1 text-slate-500">
                          ({recommendation.percentOfIncome}% of income)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
