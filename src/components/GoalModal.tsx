"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { SavingsGoal, GoalPriority, GoalType } from "@/lib/types";
import { GOAL_TYPE_CONFIG } from "@/lib/goalQuestionnaires";

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    goalType: GoalType;
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    priority: GoalPriority;
    questionnaireResponses: Record<string, string>;
  }) => void;
  goal?: SavingsGoal | null;
}

export default function GoalModal({
  open,
  onClose,
  onSave,
  goal,
}: GoalModalProps) {
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("custom");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [questionnaireResponses, setQuestionnaireResponses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setGoalType(goal.goalType ?? "custom");
      setTargetAmount(String(goal.targetAmount));
      setTargetDate(goal.targetDate.split("T")[0]);
      setMonthlyContribution(
        goal.monthlyContribution > 0 ? String(goal.monthlyContribution) : ""
      );
      setPriority(goal.priority);
      setQuestionnaireResponses(goal.questionnaireResponses ?? {});
    } else {
      setName("");
      setGoalType("custom");
      setTargetAmount("");
      setTargetDate("");
      setMonthlyContribution("");
      setPriority("medium");
      setQuestionnaireResponses({});
    }
  }, [goal, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(targetAmount);
    if (!name.trim() || isNaN(amt) || amt <= 0 || !targetDate) return;
    const requiredQuestions = GOAL_TYPE_CONFIG[goalType].questions.filter(
      (q) => q.required
    );
    for (const question of requiredQuestions) {
      if (!questionnaireResponses[question.id]?.trim()) return;
    }

    onSave({
      name: name.trim(),
      goalType,
      targetAmount: amt,
      targetDate,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      priority,
      questionnaireResponses,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 rounded-xl bg-arcana-surface border border-arcana-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {goal ? "Edit Goal" : "New Savings Goal"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House Down Payment"
              className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
              required
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Goal Type</label>
            <select
              value={goalType}
              onChange={(e) => {
                const nextType = e.target.value as GoalType;
                setGoalType(nextType);
                setQuestionnaireResponses({});
              }}
              className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white focus:outline-none focus:ring-1 focus:ring-arcana-blue"
            >
              {Object.entries(GOAL_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {GOAL_TYPE_CONFIG[goalType].description}
            </p>
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Target Amount ($)
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="50000"
              min="1"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
              required
            />
          </div>

          {/* Goal Questionnaire */}
          <div className="space-y-3 rounded-lg border border-arcana-border bg-arcana-navy/40 p-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Goal Questionnaire
            </h3>
            {GOAL_TYPE_CONFIG[goalType].questions.map((question) => (
              <div key={question.id}>
                <label className="block text-xs text-slate-400 mb-1">
                  {question.prompt}
                  {question.required ? " *" : ""}
                </label>
                <input
                  type="text"
                  value={questionnaireResponses[question.id] ?? ""}
                  onChange={(e) =>
                    setQuestionnaireResponses((prev) => ({
                      ...prev,
                      [question.id]: e.target.value,
                    }))
                  }
                  placeholder={question.placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                  required={question.required}
                />
              </div>
            ))}
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white focus:outline-none focus:ring-1 focus:ring-arcana-blue"
              required
            />
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Monthly Contribution ($)
              <span className="text-slate-500 ml-1">(optional)</span>
            </label>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="500"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Priority
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as GoalPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    priority === p
                      ? p === "high"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : p === "medium"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-arcana-navy text-slate-400 border border-arcana-border hover:border-slate-500"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-arcana-navy border border-arcana-border hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-arcana-blue hover:bg-blue-600 transition-colors"
            >
              {goal ? "Save + Regenerate Plan" : "Create Goal + Generate Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
