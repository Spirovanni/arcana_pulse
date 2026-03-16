"use client";

import {
  Target,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SavingsGoal, GoalProjection } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SavingsGoalsWidgetProps {
  goals: SavingsGoal[];
  projections: GoalProjection[];
  loading: boolean;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SavingsGoalsWidget({
  goals,
  projections,
  loading,
  onRefresh,
}: SavingsGoalsWidgetProps) {
  const projectionMap = new Map(projections.map((p) => [p.goalId, p]));

  const activeGoals = goals
    .filter((g) => g.status === "active")
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    })
    .slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Savings Goals</h3>
          <a
            href="/goals"
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
      {loading && activeGoals.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-arcana-sky animate-spin" />
            <span className="text-sm text-slate-400">
              Loading savings goals...
            </span>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && activeGoals.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <Target className="w-6 h-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            No savings goals yet. Visit the{" "}
            <a href="/goals" className="text-arcana-sky hover:underline">
              goals page
            </a>{" "}
            to create one.
          </p>
        </div>
      )}

      {/* Goals list */}
      {activeGoals.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const projection = projectionMap.get(goal.goalId);
              const pct =
                goal.targetAmount > 0
                  ? Math.min(
                      (goal.currentAmount / goal.targetAmount) * 100,
                      100
                    )
                  : 0;
              const isOnTrack = projection?.onTrack ?? true;

              return (
                <div key={goal.goalId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{goal.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                          goal.priority === "high"
                            ? "bg-red-500/10 text-red-400"
                            : goal.priority === "medium"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {goal.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOnTrack ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-arcana-success" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-arcana-warning" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          isOnTrack
                            ? "text-arcana-success"
                            : "text-arcana-warning"
                        }`}
                      >
                        {isOnTrack ? "On track" : "Behind"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-arcana-navy overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOnTrack ? "bg-arcana-success" : "bg-arcana-warning"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Values */}
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      {formatCurrency(goal.currentAmount)} of{" "}
                      {formatCurrency(goal.targetAmount)}
                    </span>
                    <span>{Math.round(pct)}% saved</span>
                  </div>

                  {/* Projection narrative */}
                  {projection && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <TrendingUp className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-500">
                        {projection.narrative}
                      </p>
                    </div>
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
