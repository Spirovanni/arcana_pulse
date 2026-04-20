"use client";

import { Award, ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle, BookOpen, FileText, Lock } from "lucide-react";
import Link from "next/link";

type ExamStatus = "passed" | "scheduled" | "studying" | "locked" | "not_started";

interface Exam {
  id: string;
  acronym: string;
  fullName: string;
  regulator: string;
  status: ExamStatus;
  readinessPct: number;
  scheduledDate?: string;
  passingScore: number;
  studyHours: number;
  studyHoursComplete: number;
  unlocksLabel?: string;
  prerequisiteOf?: string[];
  accentColor: string;
  salaryImpact: string;
  description: string;
}

const EXAMS: Exam[] = [
  {
    id: "sie",
    acronym: "SIE",
    fullName: "Securities Industry Essentials",
    regulator: "FINRA",
    status: "passed",
    readinessPct: 100,
    passingScore: 70,
    studyHours: 60,
    studyHoursComplete: 60,
    prerequisiteOf: ["series-7"],
    accentColor: "teal",
    salaryImpact: "Gateway",
    description: "Foundation exam covering capital markets, products, regulations, and prohibited practices.",
  },
  {
    id: "series-63",
    acronym: "Series 63",
    fullName: "Uniform Securities Agent State Law",
    regulator: "NASAA",
    status: "studying",
    readinessPct: 58,
    passingScore: 72,
    studyHours: 40,
    studyHoursComplete: 23,
    scheduledDate: "Jun 2026",
    accentColor: "primary",
    salaryImpact: "+8%",
    description: "State securities law exam required in most states to transact securities business.",
  },
  {
    id: "series-7",
    acronym: "Series 7",
    fullName: "General Securities Representative",
    regulator: "FINRA",
    status: "not_started",
    readinessPct: 0,
    passingScore: 72,
    studyHours: 120,
    studyHoursComplete: 0,
    scheduledDate: "Q3 2026",
    accentColor: "primary",
    salaryImpact: "+18%",
    description: "Broadest license allowing sale of virtually all securities products. Requires SIE + firm sponsorship.",
  },
  {
    id: "series-65",
    acronym: "Series 65",
    fullName: "Uniform Investment Adviser Law",
    regulator: "NASAA",
    status: "locked",
    readinessPct: 0,
    passingScore: 72,
    studyHours: 100,
    studyHoursComplete: 0,
    accentColor: "purple",
    salaryImpact: "+25%",
    description: "Required for independent investment adviser representatives. Unlocks RIA track and fiduciary positioning.",
  },
  {
    id: "cfa-l1",
    acronym: "CFA L1",
    fullName: "Chartered Financial Analyst — Level I",
    regulator: "CFA Institute",
    status: "locked",
    readinessPct: 0,
    passingScore: 0,
    studyHours: 300,
    studyHoursComplete: 0,
    accentColor: "amber",
    salaryImpact: "+35%",
    description: "Global credential covering ethics, quantitative methods, economics, and portfolio management. Unlocks elite advisory ceiling.",
  },
];

const STATUS_META: Record<ExamStatus, { label: string; colorClass: string; icon: React.ReactNode }> = {
  passed:      { label: "Passed",      colorClass: "text-arcana-success border-arcana-success/30 bg-arcana-success/10", icon: <CheckCircle2 className="size-3.5" /> },
  scheduled:   { label: "Scheduled",  colorClass: "text-primary border-primary/30 bg-primary/10",                     icon: <Clock className="size-3.5" /> },
  studying:    { label: "Studying",   colorClass: "text-teal-400 border-teal-400/30 bg-teal-400/10",                  icon: <BookOpen className="size-3.5" /> },
  not_started: { label: "Not Started",colorClass: "text-secondary border-outline/40 bg-outline/5",                   icon: <Circle className="size-3.5" /> },
  locked:      { label: "Locked",     colorClass: "text-slate-500 border-slate-500/20 bg-slate-500/5",               icon: <Lock className="size-3.5" /> },
};

const ACCENT: Record<string, { bar: string; glow: string; border: string; bg: string }> = {
  primary: { bar: "bg-primary",        glow: "shadow-[0_0_10px_rgba(197,160,89,0.4)]",  border: "border-primary/30",      bg: "bg-primary/5"   },
  teal:    { bar: "bg-teal-400",       glow: "shadow-[0_0_10px_rgba(45,212,191,0.4)]",  border: "border-teal-400/30",     bg: "bg-teal-400/5"  },
  purple:  { bar: "bg-purple-400",     glow: "shadow-[0_0_10px_rgba(192,132,252,0.4)]", border: "border-purple-400/30",   bg: "bg-purple-400/5"},
  amber:   { bar: "bg-amber-400",      glow: "shadow-[0_0_10px_rgba(251,191,36,0.4)]",  border: "border-amber-400/30",    bg: "bg-amber-400/5" },
};

function ExamCard({ exam }: { exam: Exam }) {
  const statusMeta = STATUS_META[exam.status];
  const accent = ACCENT[exam.accentColor] ?? ACCENT.primary;
  const locked = exam.status === "locked";

  return (
    <div className={`bg-surface-container-high border rounded-sm p-6 relative overflow-hidden transition-all ${locked ? "border-outline/30 opacity-60" : `${accent.border} hover:${accent.bg}`}`}>
      {!locked && <div className={`absolute top-0 right-0 w-40 h-40 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none ${accent.bg}`} />}

      <div className="relative z-10 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-headline text-xl font-light text-on-surface">{exam.acronym}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold tracking-widest border ${statusMeta.colorClass}`}>
                {statusMeta.icon}{statusMeta.label}
              </span>
            </div>
            <div className="text-[10px] text-secondary font-mono uppercase tracking-widest">{exam.regulator}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg font-light ${locked ? "text-slate-500" : "text-arcana-success"}`}>{exam.salaryImpact}</div>
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Yield Factor</div>
          </div>
        </div>

        {/* Full name */}
        <p className="text-xs text-secondary leading-relaxed">{exam.fullName}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{exam.description}</p>

        {/* Progress bar */}
        {!locked && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Readiness</span>
              <span className="text-xs font-mono text-on-surface">{exam.readinessPct}%</span>
            </div>
            <div className="w-full bg-outline/20 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${accent.bar} ${exam.readinessPct > 0 ? accent.glow : ""}`}
                style={{ width: `${exam.readinessPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>{exam.studyHoursComplete}h / {exam.studyHours}h studied</span>
              {exam.scheduledDate && (
                <span className="flex items-center gap-1"><Clock className="size-2.5" />{exam.scheduledDate}</span>
              )}
            </div>
          </div>
        )}

        {/* Passing score */}
        {!locked && exam.passingScore > 0 && (
          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 border-t border-outline/20">
            <FileText className="size-3 shrink-0" />
            Passing score: <span className="text-secondary font-mono">{exam.passingScore}%</span>
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-outline/20">
            <AlertTriangle className="size-3 shrink-0" />
            Complete Series 7 first to unlock this track
          </div>
        )}
      </div>
    </div>
  );
}

export default function LicensingReadinessPage() {
  const passed = EXAMS.filter(e => e.status === "passed").length;
  const active = EXAMS.filter(e => e.status === "studying" || e.status === "scheduled").length;
  const totalImpact = "+61%";

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Trajectory Hub
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
            <Award className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Licensing Readiness</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          FINRA and NASAA exam progression mapped against your Financial Advisor pathway. Each credential unlocks a measurable step-change in your advisory equity ceiling.
        </p>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Passed</div>
          <div className="text-2xl font-light text-arcana-success">{passed}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">of {EXAMS.filter(e => e.status !== "locked").length} active</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">In Progress</div>
          <div className="text-2xl font-light text-teal-400">{active}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">exams active</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Total Yield</div>
          <div className="text-2xl font-light text-on-surface">{totalImpact}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">comp ceiling delta</div>
        </div>
        <div className="bg-surface-container border border-primary/20 rounded-sm p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1 relative z-10">Next Exam</div>
          <div className="text-sm font-light text-primary relative z-10">Series 63</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 relative z-10">Jun 2026 · 58% ready</div>
        </div>
      </div>

      {/* Exam Grid */}
      <div className="space-y-4">
        <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
          <Award className="size-4 text-primary" /> Credential Stack
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {EXAMS.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      </div>

      {/* Regulatory Disclaimer */}
      <div className="pt-10 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <Award className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">Regulatory Disclaimer:</strong> This tracker provides career readiness context only. It is <span className="text-arcana-warning">not</span> licensing, legal, or investment advice. All exam requirements, eligibility criteria, pass thresholds, and registration procedures must be verified directly with <strong className="text-slate-400">FINRA</strong>, <strong className="text-slate-400">NASAA</strong>, and your sponsoring firm. Passing scores and study hour estimates are directional, not official.
        </p>
      </div>
    </div>
  );
}
