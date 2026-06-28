"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { computeDashboardMetrics } from "@/lib/services/dashboard";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";
import type {
  BudgetRecommendation,
  Budget,
  Category,
  CategoryBreakdown,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Status helper
// ---------------------------------------------------------------------------

function getStatus(
  actual: number,
  limit: number
): { label: string; color: string; bgColor: string; badgeBg: string } {
  const pct = limit > 0 ? (actual / limit) * 100 : 0;
  if (pct >= 100) {
    return {
      label: "Over budget",
      color: "text-arcana-danger",
      bgColor: "bg-arcana-danger",
      badgeBg: "bg-red-500/10",
    };
  }
  if (pct >= 75) {
    return {
      label: "Warning",
      color: "text-arcana-warning",
      bgColor: "bg-arcana-warning",
      badgeBg: "bg-amber-500/10",
    };
  }
  return {
    label: "On track",
    color: "text-arcana-success",
    bgColor: "bg-arcana-success",
    badgeBg: "bg-green-500/10",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BudgetsPage() {
  const metrics = computeDashboardMetrics(DEFAULT_WORKSPACE_ID);

  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [lastAnalysisAt, setLastAnalysisAt] = useState<string | null>(null);
  const [evaluationCompletedAt, setEvaluationCompletedAt] = useState<string | null>(null);
  const [evaluationScope, setEvaluationScope] = useState<string>("all");
  const [evaluatedTransactionCount, setEvaluatedTransactionCount] = useState<number>(0);

  const fetchData = useCallback(async (forceAnalysis = false) => {
    setLoading(true);
    try {
      const forceParam = forceAnalysis ? "&force=true" : "";
      const scopeParam = forceAnalysis ? "&evaluationScope=imported" : "";
      const [recRes, budRes] = await Promise.all([
        fetch(`/api/ai/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}${scopeParam}`),
        fetch(`/api/budgets?workspaceId=${DEFAULT_WORKSPACE_ID}`),
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setRecommendations(data.recommendations ?? []);
        setLastAnalysisAt(data.lastAnalysisAt ?? null);
        setEvaluationCompletedAt(data.evaluationCompletedAt ?? data.lastAnalysisAt ?? null);
        setEvaluationScope(data.evaluationScope ?? "all");
        setEvaluatedTransactionCount(data.evaluatedTransactionCount ?? 0);
      }
      if (budRes.ok) {
        const data = await budRes.json();
        setBudgets(data.budgets ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  const handleAccept = async (category: Category, amount: number) => {
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
  };

  const handleSaveEdit = async (category: Category) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;

    try {
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: DEFAULT_WORKSPACE_ID,
          category,
          amount,
          source: "user",
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
    } finally {
      setEditingCategory(null);
      setEditAmount("");
    }
  };

  // Build lookup maps
  const budgetMap = new Map(budgets.map((b) => [b.category, b]));
  const spendingMap = new Map(
    metrics.categoryBreakdown.map((s) => [s.category, s])
  );

  // Merge categories
  const categories = new Set<string>();
  budgets.forEach((b) => categories.add(b.category));
  recommendations.forEach((r) => categories.add(r.category));

  const sortedCategories = Array.from(categories).sort((a, b) => {
    const aSpend = spendingMap.get(a as Category)?.amount ?? 0;
    const bSpend = spendingMap.get(b as Category)?.amount ?? 0;
    return bSpend - aSpend;
  });

  // Summary stats
  const totalBudgeted = sortedCategories.reduce((s, cat) => {
    const budget = budgetMap.get(cat as Category);
    const rec = recommendations.find((r) => r.category === cat);
    return s + (budget?.amount ?? rec?.recommendedAmount ?? 0);
  }, 0);

  const totalSpent = sortedCategories.reduce((s, cat) => {
    return s + (spendingMap.get(cat as Category)?.amount ?? 0);
  }, 0);

  const overBudgetCount = sortedCategories.filter((cat) => {
    const budget = budgetMap.get(cat as Category);
    const rec = recommendations.find((r) => r.category === cat);
    const limit = budget?.amount ?? rec?.recommendedAmount ?? 0;
    const actual = spendingMap.get(cat as Category)?.amount ?? 0;
    return limit > 0 && actual > limit;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-generated budget recommendations with spending tracking
          </p>
        </div>
        <button
          onClick={() => void fetchData(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-arcana-blue text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Regenerate
        </button>
      </div>
      <LastAnalysisStamp
        lastAnalysisAt={lastAnalysisAt}
        className="block text-[11px] uppercase tracking-[1.5px] text-slate-400"
      />
      <p className="text-[11px] uppercase tracking-[1.5px] text-slate-500">
        Evaluation completed:{" "}
        {evaluationCompletedAt
          ? new Date(evaluationCompletedAt).toLocaleString()
          : "Not run yet"}{" "}
        · Source:{" "}
        {evaluationScope === "synced"
          ? "Imported bank transactions"
          : evaluationScope === "all_fallback"
          ? "Imported unavailable, using all transactions"
          : "All workspace transactions"}{" "}
        · Records: {evaluatedTransactionCount}
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Total Budgeted</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(totalBudgeted)}
          </p>
        </div>
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Total Spent</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Over Budget</p>
          <p
            className={`text-xl font-bold ${
              overBudgetCount > 0 ? "text-arcana-danger" : "text-arcana-success"
            }`}
          >
            {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"}
          </p>
        </div>
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
          <PieChart className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            No budget data available. Add transactions to get personalized
            recommendations.
          </p>
        </div>
      )}

      {/* Budget list */}
      {sortedCategories.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <div className="space-y-5">
            {sortedCategories.map((cat) => {
              const category = cat as Category;
              const budget = budgetMap.get(category);
              const recommendation = recommendations.find(
                (r) => r.category === category
              );
              const spending = spendingMap.get(category);
              const actual = spending?.amount ?? 0;
              const limit =
                budget?.amount ?? recommendation?.recommendedAmount ?? 0;
              const pct =
                limit > 0 ? Math.min((actual / limit) * 100, 100) : 0;
              const status = getStatus(actual, limit);
              const hasBudget = !!budget;
              const isEditing = editingCategory === cat;

              return (
                <div
                  key={cat}
                  className="pb-5 border-b border-arcana-border last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {CATEGORY_LABELS[category] ?? cat}
                      </span>
                      {hasBudget && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-arcana-success" />
                      )}
                      {!hasBudget && recommendation && (
                        <span className="text-xs text-slate-500 italic">
                          AI suggested
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${status.badgeBg} ${status.color}`}
                      >
                        {status.label}
                      </span>
                      {!isEditing && (
                        <>
                          {!hasBudget && recommendation && (
                            <button
                              onClick={() =>
                                handleAccept(
                                  category,
                                  recommendation.recommendedAmount
                                )
                              }
                              className="text-xs px-2 py-0.5 rounded bg-arcana-blue/20 text-arcana-blue hover:bg-arcana-blue/30 transition-colors"
                            >
                              Accept
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditAmount(String(limit));
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {isEditing && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-0.5 rounded text-xs bg-arcana-navy border border-arcana-border text-white focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={() => handleSaveEdit(category)}
                            className="p-1 rounded text-arcana-success hover:bg-green-500/10 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategory(null);
                              setEditAmount("");
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 rounded-full bg-arcana-navy overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${status.bgColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Values */}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      {formatCurrency(actual)} of {formatCurrency(limit)}
                    </span>
                    <span className={status.color}>
                      {limit > 0
                        ? `${Math.round((actual / limit) * 100)}% used`
                        : "No limit set"}
                    </span>
                  </div>

                  {/* Rationale */}
                  {recommendation && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      {recommendation.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
