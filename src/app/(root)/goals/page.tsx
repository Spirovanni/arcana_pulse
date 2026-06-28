"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Target,
  RefreshCw,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Pause,
  Play,
  BarChart2,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTotalInvestmentBalance } from "@/lib/services/investments";
import { runMonteCarloForGoals } from "@/lib/services/monte-carlo";
import type { MonteCarloResult } from "@/lib/services/monte-carlo";
import GoalModal from "@/components/GoalModal";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";
import type {
  SavingsGoal,
  GoalProjection,
  GoalPriority,
  GoalStatus,
} from "@/lib/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [projections, setProjections] = useState<GoalProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editingAmount, setEditingAmount] = useState<{
    goalId: string;
    value: string;
  } | null>(null);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<string | null>(null);

  const fetchData = useCallback(async (forceAnalysis = false) => {
    setLoading(true);
    try {
      const forceParam = forceAnalysis ? "&force=true" : "";
      const [goalsRes, projRes] = await Promise.all([
        fetch(`/api/goals?workspaceId=${DEFAULT_WORKSPACE_ID}`),
        fetch(`/api/ai/goals?workspaceId=${DEFAULT_WORKSPACE_ID}${forceParam}`),
      ]);

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals ?? []);
      }
      if (projRes.ok) {
        const data = await projRes.json();
        setProjections(data.projections ?? []);
        setLastAnalysisAt(data.lastAnalysisAt ?? null);
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

  const handleCreate = async (data: {
    name: string;
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    priority: GoalPriority;
  }) => {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: DEFAULT_WORKSPACE_ID,
          ...data,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setGoals((prev) => [...prev, result.goal]);
        setModalOpen(false);
      }
    } catch {
      // Silently fail
    }
  };

  const handleEdit = async (data: {
    name: string;
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    priority: GoalPriority;
  }) => {
    if (!editingGoal) return;
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: editingGoal.goalId,
          ...data,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setGoals((prev) =>
          prev.map((g) =>
            g.goalId === editingGoal.goalId ? result.goal : g
          )
        );
        setEditingGoal(null);
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals?goalId=${goalId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.goalId !== goalId));
      }
    } catch {
      // Silently fail
    }
  };

  const handleToggleStatus = async (goal: SavingsGoal) => {
    const newStatus: GoalStatus =
      goal.status === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.goalId, status: newStatus }),
      });
      if (res.ok) {
        const result = await res.json();
        setGoals((prev) =>
          prev.map((g) => (g.goalId === goal.goalId ? result.goal : g))
        );
      }
    } catch {
      // Silently fail
    }
  };

  const handleUpdateCurrentAmount = async (goalId: string) => {
    if (!editingAmount || editingAmount.goalId !== goalId) return;
    const amount = parseFloat(editingAmount.value);
    if (isNaN(amount) || amount < 0) return;

    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, currentAmount: amount }),
      });
      if (res.ok) {
        const result = await res.json();
        setGoals((prev) =>
          prev.map((g) => (g.goalId === goalId ? result.goal : g))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setEditingAmount(null);
    }
  };

  const projectionMap = new Map(projections.map((p) => [p.goalId, p]));

  const activeGoals = goals.filter((g) => g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const completedGoals = goals.filter((g) => g.status === "completed");

  // Summary stats
  const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0);

  // Monte Carlo projections (client-side, instant)
  const totalInvestmentBalance = getTotalInvestmentBalance(DEFAULT_WORKSPACE_ID);
  const perGoalLinked = activeGoals.length > 0 ? totalInvestmentBalance / activeGoals.length : 0;

  const mcResults = useMemo<MonteCarloResult[]>(() => {
    if (activeGoals.length === 0) return [];
    return runMonteCarloForGoals(
      activeGoals.map((g) => ({
        goalId: g.goalId,
        currentAmount: g.currentAmount,
        targetAmount: g.targetAmount,
        targetDate: g.targetDate,
        monthlyContribution: g.monthlyContribution,
        linkedInvestmentValue: perGoalLinked,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  const mcMap = new Map(mcResults.map((r) => [r.goalId, r]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your savings targets with AI-powered projections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-arcana-sky bg-arcana-surface border border-arcana-border hover:bg-arcana-navy transition-colors disabled:opacity-50"
          >
            <Sparkles
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingGoal(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-arcana-blue text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        </div>
      </div>
      <LastAnalysisStamp
        lastAnalysisAt={lastAnalysisAt}
        className="block text-[11px] uppercase tracking-[1.5px] text-slate-400"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Total Target</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(totalTarget)}
          </p>
        </div>
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Total Saved</p>
          <p className="text-xl font-bold text-arcana-success">
            {formatCurrency(totalSaved)}
          </p>
        </div>
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-sm text-slate-400 mb-1">Active Goals</p>
          <p className="text-xl font-bold text-arcana-sky">
            {activeGoals.length}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && goals.length === 0 && (
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
      {!loading && goals.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <Target className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-4">
            No savings goals yet. Create your first goal to start tracking your
            progress.
          </p>
          <button
            onClick={() => {
              setEditingGoal(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-arcana-blue text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Goal
          </button>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Active Goals
          </h2>
          <div className="space-y-5">
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
              const isEditingAmt =
                editingAmount?.goalId === goal.goalId;

              return (
                <div
                  key={goal.goalId}
                  className="pb-5 border-b border-arcana-border last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {goal.name}
                      </span>
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
                      {isOnTrack ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-arcana-success font-medium">
                          On track
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-arcana-warning font-medium">
                          Behind
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(goal)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                        title="Pause goal"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                        title="Edit goal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.goalId)}
                        className="p-1 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 rounded-full bg-arcana-navy overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOnTrack ? "bg-arcana-success" : "bg-arcana-warning"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Values row */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      {isEditingAmt ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">$</span>
                          <input
                            type="number"
                            value={editingAmount.value}
                            onChange={(e) =>
                              setEditingAmount({
                                goalId: goal.goalId,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleUpdateCurrentAmount(goal.goalId);
                              if (e.key === "Escape")
                                setEditingAmount(null);
                            }}
                            onBlur={() =>
                              handleUpdateCurrentAmount(goal.goalId)
                            }
                            className="w-24 px-2 py-0.5 rounded text-xs bg-arcana-navy border border-arcana-border text-white focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <span className="text-slate-400">
                            of {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingAmount({
                              goalId: goal.goalId,
                              value: String(goal.currentAmount),
                            })
                          }
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Click to update saved amount"
                        >
                          {formatCurrency(goal.currentAmount)} of{" "}
                          {formatCurrency(goal.targetAmount)}
                        </button>
                      )}
                    </div>
                    <span className={isOnTrack ? "text-arcana-success" : "text-arcana-warning"}>
                      {Math.round(pct)}% saved
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>
                      Target:{" "}
                      {formatDate(goal.targetDate, {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {goal.monthlyContribution > 0 && (
                      <span>
                        Contributing: {formatCurrency(goal.monthlyContribution)}
                        /mo
                      </span>
                    )}
                    {projection && (
                      <span>
                        Suggested:{" "}
                        {formatCurrency(
                          projection.suggestedMonthlyContribution
                        )}
                        /mo
                      </span>
                    )}
                  </div>

                  {/* AI projection narrative */}
                  {projection && (
                    <div className="flex items-start gap-1.5 mt-2">
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

      {/* Paused goals */}
      {pausedGoals.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h2 className="text-sm font-semibold text-slate-400 mb-4">
            Paused Goals
          </h2>
          <div className="space-y-3">
            {pausedGoals.map((goal) => {
              const pct =
                goal.targetAmount > 0
                  ? Math.min(
                      (goal.currentAmount / goal.targetAmount) * 100,
                      100
                    )
                  : 0;

              return (
                <div
                  key={goal.goalId}
                  className="flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-slate-300 truncate">
                      {goal.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(goal)}
                      className="p-1 rounded text-slate-400 hover:text-arcana-success hover:bg-green-500/10 transition-colors"
                      title="Resume goal"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.goalId)}
                      className="p-1 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h2 className="text-sm font-semibold text-slate-400 mb-4">
            Completed Goals
          </h2>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <div
                key={goal.goalId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-arcana-success" />
                  <span className="text-sm text-slate-300">{goal.name}</span>
                </div>
                <span className="text-xs text-arcana-success">
                  {formatCurrency(goal.targetAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monte Carlo Investment Projections ── */}
      {mcResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Investment Scenarios
            </h2>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
              Monte Carlo · 500 simulations
            </span>
          </div>
          {totalInvestmentBalance > 0 && (
            <p className="text-xs text-slate-500">
              Projections include {formatCurrency(totalInvestmentBalance)} in linked investment accounts,
              allocated proportionally across {activeGoals.length} goal{activeGoals.length !== 1 ? "s" : ""}.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mcResults.map((mc) => {
              const goal = activeGoals.find((g) => g.goalId === mc.goalId);
              if (!goal) return null;
              const prob = mc.successProbability;
              const probColor = prob >= 75 ? "text-green-400" : prob >= 50 ? "text-amber-400" : "text-red-400";
              const probBg    = prob >= 75 ? "bg-green-400/10 border-green-400/20" : prob >= 50 ? "bg-amber-400/10 border-amber-400/20" : "bg-red-400/10 border-red-400/20";

              const months = mc.chartData[mc.chartData.length - 1]?.month ?? 0;
              const xTickCount = Math.min(6, mc.chartData.length);
              const tickStep = Math.ceil(mc.chartData.length / xTickCount);
              const xTicks = mc.chartData.filter((_, i) => i % tickStep === 0).map((d) => d.month);

              return (
                <div key={mc.goalId} className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{goal.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Target: {formatCurrency(goal.targetAmount)} by{" "}
                        {formatDate(goal.targetDate, { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-bold ${probBg} ${probColor}`}>
                      <Zap className="w-3.5 h-3.5" />
                      {prob}%
                    </div>
                  </div>

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={mc.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`opt-${mc.goalId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={`exp-${mc.goalId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={`pes-${mc.goalId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        ticks={xTicks}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => `m${v}`}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        axisLine={false} tickLine={false} width={44}
                      />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                        formatter={(v, name) => [formatCurrency(Number(v)), name]}
                        labelFormatter={(v) => `Month ${v}`}
                      />
                      <ReferenceLine y={goal.targetAmount} stroke="#C5A059" strokeDasharray="4 3" strokeWidth={1} label={{ value: "Target", fill: "#C5A059", fontSize: 9, position: "right" }} />
                      <Area type="monotone" dataKey="optimistic"  name="Optimistic (10%)"  stroke="#10B981" strokeWidth={1.5} fill={`url(#opt-${mc.goalId})`} dot={false} />
                      <Area type="monotone" dataKey="expected"    name="Expected (7%)"     stroke="#3B82F6" strokeWidth={1.5} fill={`url(#exp-${mc.goalId})`} dot={false} />
                      <Area type="monotone" dataKey="pessimistic" name="Pessimistic (3%)"  stroke="#F59E0B" strokeWidth={1.5} fill={`url(#pes-${mc.goalId})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Scenario final values */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-arcana-border">
                    {[
                      { label: "Pessimistic", value: mc.scenarios.pessimistic.finalValue, color: "text-amber-400", rate: "3%" },
                      { label: "Expected",    value: mc.scenarios.expected.finalValue,    color: "text-blue-400",  rate: "7%" },
                      { label: "Optimistic",  value: mc.scenarios.optimistic.finalValue,  color: "text-green-400", rate: "10%" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{s.label} · {s.rate}</p>
                        <p className={`text-sm font-bold tabular-nums ${s.color}`}>{formatCurrency(s.value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contribution suggestion */}
                  {mc.suggestedContribution > 0 && Math.abs(mc.suggestedContribution - goal.monthlyContribution) > 10 && (
                    <div className="mt-3 flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
                      <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        To reach this goal by {formatDate(goal.targetDate, { month: "short", year: "numeric" })} at 7% returns,
                        contribute <span className="text-primary font-semibold">{formatCurrency(mc.suggestedContribution)}/mo</span>
                        {goal.monthlyContribution > 0 && (
                          <span className="text-slate-500">
                            {" "}(currently {formatCurrency(goal.monthlyContribution)}/mo —{" "}
                            {mc.suggestedContribution > goal.monthlyContribution ? "increase by " : "decrease by "}
                            {formatCurrency(Math.abs(mc.suggestedContribution - goal.monthlyContribution))})
                          </span>
                        )}.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <GoalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={editingGoal ? handleEdit : handleCreate}
        goal={editingGoal}
      />
    </div>
  );
}
