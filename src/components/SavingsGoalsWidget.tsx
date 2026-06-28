"use client";

import { Target, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SavingsGoal, GoalProjection } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";

interface SavingsGoalsWidgetProps {
  goals: SavingsGoal[];
  projections: GoalProjection[];
  loading: boolean;
  onRefresh: () => void;
  lastAnalysisAt: string | null;
}

export default function SavingsGoalsWidget({
  goals,
  projections,
  loading,
  onRefresh,
  lastAnalysisAt,
}: SavingsGoalsWidgetProps) {
  const projectionMap = new Map(projections.map((p) => [p.goalId, p]));

  const activeGoals = goals
    .filter((g) => g.status === "active")
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <span className="block text-[9px] uppercase tracking-[2px] text-secondary font-bold">Savings Targets</span>
            <LastAnalysisStamp lastAnalysisAt={lastAnalysisAt} />
          </div>
          <a href="/goals" className="text-[9px] uppercase tracking-[1px] text-primary/60 hover:text-primary transition-colors">
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

      {loading && activeGoals.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-secondary uppercase tracking-wider">Loading goals...</span>
          </div>
        </div>
      )}

      {!loading && activeGoals.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center">
          <Target className="w-5 h-5 text-secondary mx-auto mb-2" />
          <p className="text-xs text-secondary uppercase tracking-wider">
            No active goals.{" "}
            <a href="/goals" className="text-primary hover:underline">Create one →</a>
          </p>
        </div>
      )}

      {activeGoals.length > 0 && (
        <div className="space-y-6">
          {activeGoals.map((goal) => {
            const projection = projectionMap.get(goal.goalId);
            const pct = goal.targetAmount > 0
              ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
              : 0;
            const isOnTrack = projection?.onTrack ?? true;

            return (
              <div key={goal.goalId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface font-medium">{goal.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold ${
                      goal.priority === "high" ? "bg-red-500/10 text-red-400"
                      : goal.priority === "medium" ? "bg-amber-500/10 text-amber-400"
                      : "bg-outline text-secondary"
                    }`}>
                      {goal.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isOnTrack
                      ? <CheckCircle2 className="w-3 h-3 text-arcana-success" />
                      : <AlertTriangle className="w-3 h-3 text-arcana-warning" />}
                    <span className={`text-[9px] uppercase tracking-wider font-bold ${isOnTrack ? "text-arcana-success" : "text-arcana-warning"}`}>
                      {isOnTrack ? "On track" : "Behind"}
                    </span>
                  </div>
                </div>

                <ProgressBar
                  value={pct}
                  colorClass={isOnTrack ? "bg-gradient-to-r from-primary-container to-primary drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]" : "bg-gradient-to-r from-arcana-warning/80 to-arcana-warning drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"}
                  className="mb-2"
                />

                <div className="flex justify-between text-[9px] text-secondary font-mono uppercase tracking-wider">
                  <span>{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span>
                  <span>{Math.round(pct)}% saved</span>
                </div>

                {projection && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <TrendingUp className="w-3 h-3 text-secondary mt-px flex-shrink-0" />
                    <p className="text-[10px] text-secondary leading-relaxed">{projection.narrative}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
