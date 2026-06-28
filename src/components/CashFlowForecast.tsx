"use client";

import { AlertTriangle, Repeat, RefreshCw, BarChart3 } from "lucide-react";
import { ProgressFill } from "@/components/ProgressBar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { CashFlowForecast as CashFlowForecastType, Category } from "@/lib/types";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
};

interface CashFlowForecastProps {
  data: CashFlowForecastType | null;
  loading: boolean;
  onRefresh: () => void;
  lastAnalysisAt: string | null;
}

export default function CashFlowForecast({
  data,
  loading,
  onRefresh,
  lastAnalysisAt,
}: CashFlowForecastProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1">
          <span className="block text-[9px] uppercase tracking-[2px] text-secondary font-bold">Cash Flow Intelligence</span>
          <LastAnalysisStamp lastAnalysisAt={lastAnalysisAt} />
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

      {loading && !data && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-secondary uppercase tracking-wider">Analyzing patterns...</span>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center">
          <BarChart3 className="w-5 h-5 text-secondary mx-auto mb-2" />
          <p className="text-xs text-secondary uppercase tracking-wider">
            {lastAnalysisAt ? "No forecast data available" : "No analysis yet. Click refresh to run."}
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.aiSummary && (
            <div className="rounded-sm bg-surface-container-high border border-outline p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-sm flex-shrink-0 bg-primary/10">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs text-on-surface/80 leading-relaxed">{data.aiSummary}</p>
              </div>
            </div>
          )}

          {data.forecast.length > 0 && (
            <div className="rounded-sm bg-surface-container-high border border-outline p-5">
              <h4 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-4">Projected Cash Flow</h4>
              <div className="space-y-3">
                {data.forecast.map((bucket) => {
                  const maxVal = Math.max(bucket.projectedIncome, bucket.projectedExpense, 1);
                  return (
                    <div key={bucket.month} className="flex items-center gap-4">
                      <span className="w-16 text-secondary font-mono text-[10px]">{bucket.month}</span>
                      <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 h-1.5 bg-outline/30 rounded-full overflow-hidden relative">
                          <ProgressFill value={(bucket.projectedIncome / maxVal) * 100} colorClass="bg-gradient-to-r from-arcana-success/80 to-arcana-success drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </div>
                        <span className="text-[10px] text-arcana-success w-20 text-right font-mono font-medium">
                          +{formatCurrency(bucket.projectedIncome)}
                        </span>
                      </div>
                      <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 h-1.5 bg-outline/30 rounded-full overflow-hidden relative">
                          <ProgressFill value={(bucket.projectedExpense / maxVal) * 100} colorClass="bg-gradient-to-r from-arcana-danger/80 to-arcana-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                        </div>
                        <span className="text-[10px] text-arcana-danger w-20 text-right font-mono">
                          -{formatCurrency(bucket.projectedExpense)}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-sm ${
                        bucket.netCashFlow >= 0 ? "bg-green-500/10 text-arcana-success" : "bg-red-500/10 text-arcana-danger"
                      }`}>
                        {bucket.netCashFlow >= 0 ? "+" : ""}{formatCurrency(bucket.netCashFlow)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.flaggedExpenses.length > 0 && (
            <div className="rounded-sm bg-surface-container-high border border-outline p-5">
              <h4 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-4">Upcoming Large Expenses</h4>
              <div className="space-y-1">
                {data.flaggedExpenses.map((expense, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-outline/40 last:border-0">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-arcana-warning flex-shrink-0" />
                      <div>
                        <p className="text-xs text-on-surface font-medium">{expense.title}</p>
                        <p className="text-[10px] text-secondary font-mono mt-0.5">
                          {CATEGORY_LABELS[expense.category as Category] ?? expense.category} · {formatDate(expense.expectedDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-arcana-danger">{formatCurrency(expense.expectedAmount)}</p>
                      <span className="text-[9px] bg-amber-500/10 text-arcana-warning px-1.5 py-0.5 uppercase tracking-wider font-bold">
                        {expense.percentOfAvgIncome}% income
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recurringPatterns.length > 0 && (
            <div className="rounded-sm bg-surface-container-high border border-outline p-5">
              <h4 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-4">
                Recurring Patterns ({data.recurringPatterns.length})
              </h4>
              <div className="space-y-1">
                {data.recurringPatterns.slice(0, 8).map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between py-2.5 border-b border-outline/40 last:border-0">
                    <div className="flex items-center gap-3">
                      <Repeat className={`w-3.5 h-3.5 flex-shrink-0 ${
                        pattern.transactionType === "income" ? "text-arcana-success" : "text-arcana-danger"
                      }`} />
                      <div>
                        <p className="text-xs text-on-surface font-medium">{pattern.title}</p>
                        <p className="text-[10px] text-secondary font-mono mt-0.5">
                          {CATEGORY_LABELS[pattern.category as Category] ?? pattern.category} · {FREQUENCY_LABELS[pattern.frequency]} · {pattern.occurrenceCount}×
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-mono font-medium ${
                        pattern.transactionType === "income" ? "text-arcana-success" : "text-arcana-danger"
                      }`}>
                        {pattern.transactionType === "income" ? "+" : "-"}{formatCurrency(pattern.averageAmount)}
                      </p>
                      <p className="text-[10px] text-secondary font-mono">
                        Next {formatDate(pattern.nextExpected)}
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
