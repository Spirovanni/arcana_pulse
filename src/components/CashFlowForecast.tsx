"use client";

import {
  AlertTriangle,
  Repeat,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { CashFlowForecast as CashFlowForecastType, Category } from "@/lib/types";

// ---------------------------------------------------------------------------
// Frequency labels
// ---------------------------------------------------------------------------

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CashFlowForecastProps {
  data: CashFlowForecastType | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function CashFlowForecast({
  data,
  loading,
  onRefresh,
}: CashFlowForecastProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Cash Flow Forecast</h3>
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
      {loading && !data && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-arcana-sky animate-spin" />
            <span className="text-sm text-slate-400">
              Analyzing patterns...
            </span>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !data && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <BarChart3 className="w-6 h-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No forecast data available</p>
        </div>
      )}

      {/* Loaded */}
      {data && (
        <div className="space-y-4">
          {/* AI Summary */}
          {data.aiSummary && (
            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg flex-shrink-0 bg-blue-500/10">
                  <BarChart3 className="w-5 h-5 text-arcana-sky" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.aiSummary}
                </p>
              </div>
            </div>
          )}

          {/* Projected Monthly Bars */}
          {data.forecast.length > 0 && (
            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Projected Cash Flow
              </h4>
              <div className="space-y-3">
                {data.forecast.map((bucket) => {
                  const maxVal = Math.max(
                    bucket.projectedIncome,
                    bucket.projectedExpense,
                    1
                  );
                  return (
                    <div
                      key={bucket.month}
                      className="flex items-center gap-4 text-sm"
                    >
                      <span className="w-20 text-slate-400 font-mono text-xs">
                        {bucket.month}
                      </span>
                      <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 h-2 rounded-full bg-arcana-navy overflow-hidden">
                          <div
                            className="h-full rounded-full bg-arcana-success"
                            style={{
                              width: `${(bucket.projectedIncome / maxVal) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-arcana-success w-20 text-right">
                          +{formatCurrency(bucket.projectedIncome)}
                        </span>
                      </div>
                      <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 h-2 rounded-full bg-arcana-navy overflow-hidden">
                          <div
                            className="h-full rounded-full bg-arcana-danger"
                            style={{
                              width: `${(bucket.projectedExpense / maxVal) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-arcana-danger w-20 text-right">
                          -{formatCurrency(bucket.projectedExpense)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          bucket.netCashFlow >= 0
                            ? "bg-green-500/10 text-arcana-success"
                            : "bg-red-500/10 text-arcana-danger"
                        }`}
                      >
                        {bucket.netCashFlow >= 0 ? "+" : ""}
                        {formatCurrency(bucket.netCashFlow)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flagged Upcoming Expenses */}
          {data.flaggedExpenses.length > 0 && (
            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Upcoming Large Expenses
              </h4>
              <div className="space-y-2">
                {data.flaggedExpenses.map((expense, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-arcana-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-arcana-warning flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">{expense.title}</p>
                        <p className="text-xs text-slate-400">
                          {CATEGORY_LABELS[expense.category as Category] ??
                            expense.category}{" "}
                          &middot;{" "}
                          {new Date(expense.expectedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-arcana-danger">
                        {formatCurrency(expense.expectedAmount)}
                      </p>
                      <span className="text-xs bg-amber-500/10 text-arcana-warning px-2 py-0.5 rounded">
                        {expense.percentOfAvgIncome}% of income
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected Recurring Transactions */}
          {data.recurringPatterns.length > 0 && (
            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Detected Recurring Transactions (
                {data.recurringPatterns.length})
              </h4>
              <div className="space-y-2">
                {data.recurringPatterns.slice(0, 8).map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between py-2 border-b border-arcana-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Repeat
                        className={`w-4 h-4 flex-shrink-0 ${
                          pattern.transactionType === "income"
                            ? "text-arcana-success"
                            : "text-arcana-danger"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-white">{pattern.title}</p>
                        <p className="text-xs text-slate-400">
                          {CATEGORY_LABELS[pattern.category as Category] ??
                            pattern.category}{" "}
                          &middot; {FREQUENCY_LABELS[pattern.frequency]}{" "}
                          &middot; {pattern.occurrenceCount} occurrences
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          pattern.transactionType === "income"
                            ? "text-arcana-success"
                            : "text-arcana-danger"
                        }`}
                      >
                        {pattern.transactionType === "income" ? "+" : "-"}
                        {formatCurrency(pattern.averageAmount)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Next:{" "}
                        {new Date(pattern.nextExpected).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
