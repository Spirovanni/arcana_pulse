"use client";

import { CheckCircle2, Circle, Clock, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ProgressFill } from "@/components/ProgressBar";

const PATHWAY = {
  target: "Financial Advisor",
  currentRole: "Wealth Management Associate",
  currentMonth: 4,
  totalMonths: 12,
  completionPct: 33,
  velocityLabel: "On-Track",
  proximalGoals: [
    { label: "Pass Series 63 Exam", done: false, due: "Jun 2026" },
    { label: "Complete 100-Client Milestone", done: false, due: "Aug 2026" },
    { label: "Obtain Series 7 License", done: false, due: "Q3 2026" },
    { label: "Finra Registration Active", done: true, due: null },
    { label: "State Insurance License", done: true, due: null },
  ],
};

export default function ActivePathwayWidget() {
  const elapsed = `Month ${PATHWAY.currentMonth} of ${PATHWAY.totalMonths}`;

  return (
    <div className="bg-surface-container border border-primary/30 rounded-sm relative overflow-hidden shadow-[0_0_30px_rgba(197,160,89,0.07)]">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />

      {/* Header strip */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] uppercase tracking-[3px] text-primary font-bold">Active Pathway Execution</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-secondary font-mono">
          <Zap className="size-3 text-primary" />
          {PATHWAY.velocityLabel}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Left — Trajectory telemetry */}
        <div className="space-y-5">
          {/* Target → Current */}
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Target Role</div>
            <div className="font-headline text-xl font-light text-on-surface">{PATHWAY.target}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Current Position</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3.5 text-primary shrink-0" />
              <span className="text-sm text-on-surface font-medium">{PATHWAY.currentRole}</span>
              <span className="text-[10px] text-secondary font-mono ml-1 border border-outline/50 px-1.5 py-0.5 rounded-sm">{elapsed}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Pathway Completion</span>
              <span className="text-sm font-mono text-primary font-bold">{PATHWAY.completionPct}%</span>
            </div>
            <div className="w-full bg-outline/20 rounded-full h-1.5 relative overflow-hidden">
              <ProgressFill value={PATHWAY.completionPct} colorClass="bg-primary rounded-full" />
            </div>
            <div className="text-[10px] text-secondary font-mono">
              Est. completion: <span className="text-on-surface">Apr 2027</span>
            </div>
          </div>
        </div>

        {/* Right — Proximal goal checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Immediate Proximate Goals</div>
            <Link href="/intelligence/career/licensing" className="text-[9px] uppercase tracking-widest text-primary hover:text-primary-container font-bold transition-colors">
              View Credentials →
            </Link>
          </div>
          {PATHWAY.proximalGoals.map((goal) => (
            <div key={goal.label} className="flex items-center gap-3">
              {goal.done ? (
                <CheckCircle2 className="size-4 text-arcana-success shrink-0" />
              ) : (
                <Circle className="size-4 text-secondary shrink-0" />
              )}
              <span className={`text-xs flex-1 leading-snug ${goal.done ? "line-through text-secondary" : "text-on-surface"}`}>
                {goal.label}
              </span>
              {!goal.done && goal.due && (
                <div className="flex items-center gap-1 text-[9px] text-secondary font-mono shrink-0">
                  <Clock className="size-2.5" />
                  {goal.due}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
