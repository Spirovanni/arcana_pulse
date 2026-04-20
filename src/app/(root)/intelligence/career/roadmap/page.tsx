"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle2, Circle, Lock, Zap, Award } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleStatus = "complete" | "in_progress" | "available" | "locked";
type PhaseStatus = "complete" | "active" | "locked";

interface Lesson {
  title: string;
  done: boolean;
}

interface Module {
  id: string;
  title: string;
  status: ModuleStatus;
  progressPct: number;
  estimatedHours: number;
  lessons: Lesson[];
  badgeOnComplete?: string;
  linkedExam?: string;
}

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  completionPct: number;
  accentColor: string;
  modules: Module[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: "foundation",
    number: 1,
    title: "Foundation",
    subtitle: "Client Service & Industry Essentials",
    status: "active",
    completionPct: 72,
    accentColor: "teal",
    modules: [
      {
        id: "f1",
        title: "Financial Services Industry Overview",
        status: "complete",
        progressPct: 100,
        estimatedHours: 4,
        badgeOnComplete: "Industry Baseline",
        lessons: [
          { title: "Broker-Dealers vs. RIAs: Structure & Regulation", done: true },
          { title: "FINRA & SEC Oversight Roles", done: true },
          { title: "Product Universe: Equities, Fixed Income, Alternatives", done: true },
          { title: "Compensation Models: Commission vs. Fee-Only", done: true },
        ],
      },
      {
        id: "f2",
        title: "Client Communication & Relationship Building",
        status: "complete",
        progressPct: 100,
        estimatedHours: 6,
        badgeOnComplete: "Client Operations",
        lessons: [
          { title: "Discovery Meeting Framework", done: true },
          { title: "Active Listening & Needs Assessment", done: true },
          { title: "Handling Objections & Difficult Conversations", done: true },
          { title: "CRM Systems & Pipeline Management", done: true },
          { title: "Client Retention Metrics", done: true },
        ],
      },
      {
        id: "f3",
        title: "Securities Products Fundamentals",
        status: "in_progress",
        progressPct: 60,
        estimatedHours: 8,
        lessons: [
          { title: "Equity Markets: Mechanics & Pricing", done: true },
          { title: "Bond Basics: Duration, Yield, Credit Risk", done: true },
          { title: "Mutual Funds & ETFs", done: true },
          { title: "Options & Derivatives Overview", done: false },
          { title: "Annuities & Insurance Products", done: false },
        ],
      },
    ],
  },
  {
    id: "licensing",
    number: 2,
    title: "Licensing Track",
    subtitle: "FINRA & NASAA Credential Acquisition",
    status: "active",
    completionPct: 40,
    accentColor: "primary",
    modules: [
      {
        id: "l1",
        title: "SIE Exam Preparation",
        status: "complete",
        progressPct: 100,
        estimatedHours: 60,
        badgeOnComplete: "SIE Passed ✓",
        linkedExam: "SIE",
        lessons: [
          { title: "Capital Markets & Economic Factors", done: true },
          { title: "Understanding Products & Their Risks", done: true },
          { title: "Trading, Customer Accounts & Prohibited Activities", done: true },
          { title: "Overview of the Regulatory Framework", done: true },
        ],
      },
      {
        id: "l2",
        title: "Series 63 — State Securities Law",
        status: "in_progress",
        progressPct: 58,
        estimatedHours: 40,
        linkedExam: "Series 63",
        lessons: [
          { title: "Uniform Securities Act Overview", done: true },
          { title: "Registration of Securities & Exemptions", done: true },
          { title: "Agent & Broker-Dealer Registration", done: true },
          { title: "Investment Adviser Definitions", done: false },
          { title: "State-Specific Regulatory Nuances", done: false },
          { title: "Practice Exam: 60 Questions", done: false },
        ],
      },
      {
        id: "l3",
        title: "Series 7 — General Securities Representative",
        status: "available",
        progressPct: 0,
        estimatedHours: 120,
        linkedExam: "Series 7",
        lessons: [
          { title: "Equity Securities & Markets", done: false },
          { title: "Debt Securities & Pricing", done: false },
          { title: "Options Strategies (Full Coverage)", done: false },
          { title: "Packaged Products", done: false },
          { title: "Retirement Accounts & Tax Treatment", done: false },
          { title: "New Accounts & Customer Profiles", done: false },
          { title: "Practice Exam: 135 Questions (×4)", done: false },
        ],
      },
    ],
  },
  {
    id: "advisory",
    number: 3,
    title: "Advisory Architecture",
    subtitle: "Wealth Management & Fiduciary Standards",
    status: "locked",
    completionPct: 0,
    accentColor: "purple",
    modules: [
      {
        id: "a1",
        title: "Portfolio Construction Principles",
        status: "locked",
        progressPct: 0,
        estimatedHours: 20,
        lessons: [
          { title: "Modern Portfolio Theory", done: false },
          { title: "Asset Allocation & Rebalancing", done: false },
          { title: "Risk-Adjusted Return Metrics", done: false },
          { title: "Tax-Efficient Investing", done: false },
        ],
      },
      {
        id: "a2",
        title: "Fiduciary Standards & Ethics",
        status: "locked",
        progressPct: 0,
        estimatedHours: 12,
        linkedExam: "Series 65",
        lessons: [
          { title: "Suitability vs. Fiduciary Standard", done: false },
          { title: "Conflicts of Interest Disclosure", done: false },
          { title: "ERISA Compliance Basics", done: false },
          { title: "Ethical Decision Frameworks", done: false },
        ],
      },
      {
        id: "a3",
        title: "Macroeconomic Analysis for Advisors",
        status: "locked",
        progressPct: 0,
        estimatedHours: 16,
        lessons: [
          { title: "Monetary Policy & Interest Rate Cycles", done: false },
          { title: "Inflation, GDP & Labor Market Indicators", done: false },
          { title: "Sector Rotation Strategies", done: false },
          { title: "Global Market Correlations", done: false },
        ],
      },
    ],
  },
  {
    id: "elite",
    number: 4,
    title: "Elite Track",
    subtitle: "Senior Advisor, Partner & AUM Growth",
    status: "locked",
    completionPct: 0,
    accentColor: "amber",
    modules: [
      {
        id: "e1",
        title: "CFA Level I Preparation",
        status: "locked",
        progressPct: 0,
        estimatedHours: 300,
        linkedExam: "CFA L1",
        lessons: [
          { title: "Ethics & Professional Standards", done: false },
          { title: "Quantitative Methods", done: false },
          { title: "Fixed Income & Derivatives", done: false },
          { title: "Equity Valuation", done: false },
          { title: "Portfolio Management & Wealth Planning", done: false },
        ],
      },
      {
        id: "e2",
        title: "Estate & Tax Planning",
        status: "locked",
        progressPct: 0,
        estimatedHours: 24,
        lessons: [
          { title: "Estate Structures: Trusts, Wills & Beneficiaries", done: false },
          { title: "Gift & Estate Tax Thresholds", done: false },
          { title: "Charitable Giving Vehicles", done: false },
          { title: "Multi-Generational Wealth Transfer", done: false },
        ],
      },
      {
        id: "e3",
        title: "Business Development & AUM Growth",
        status: "locked",
        progressPct: 0,
        estimatedHours: 18,
        lessons: [
          { title: "Referral Architecture & COI Network Building", done: false },
          { title: "Thought Leadership & Personal Brand", done: false },
          { title: "Fee Negotiation & Tiered Service Models", done: false },
          { title: "Practice Succession Planning", done: false },
        ],
      },
    ],
  },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const ACCENT: Record<string, { border: string; bg: string; bar: string; text: string; glow: string; badge: string }> = {
  teal:    { border: "border-teal-500/30",   bg: "bg-teal-500/5",   bar: "bg-teal-400",   text: "text-teal-400",   glow: "shadow-[0_0_10px_rgba(45,212,191,0.4)]",  badge: "border-teal-400/30 text-teal-400 bg-teal-400/5"   },
  primary: { border: "border-primary/30",    bg: "bg-primary/5",    bar: "bg-primary",     text: "text-primary",    glow: "shadow-[0_0_10px_rgba(197,160,89,0.4)]",  badge: "border-primary/30 text-primary bg-primary/5"      },
  purple:  { border: "border-purple-400/30", bg: "bg-purple-400/5", bar: "bg-purple-400",  text: "text-purple-400", glow: "shadow-[0_0_10px_rgba(192,132,252,0.4)]", badge: "border-purple-400/30 text-purple-400 bg-purple-400/5"},
  amber:   { border: "border-amber-400/30",  bg: "bg-amber-400/5",  bar: "bg-amber-400",   text: "text-amber-400",  glow: "shadow-[0_0_10px_rgba(251,191,36,0.4)]",  badge: "border-amber-400/30 text-amber-400 bg-amber-400/5" },
};

const MODULE_STATUS_ICON: Record<ModuleStatus, React.ReactNode> = {
  complete:    <CheckCircle2 className="size-4 text-arcana-success shrink-0" />,
  in_progress: <div className="size-4 rounded-full border-2 border-primary shrink-0 flex items-center justify-center"><div className="size-1.5 rounded-full bg-primary" /></div>,
  available:   <Circle className="size-4 text-secondary shrink-0" />,
  locked:      <Lock className="size-4 text-slate-600 shrink-0" />,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModuleRow({ mod, accent, phaseActive }: { mod: Module; accent: typeof ACCENT[string]; phaseActive: boolean }) {
  const [open, setOpen] = useState(false);
  const locked = mod.status === "locked";
  const doneLessons = mod.lessons.filter(l => l.done).length;

  return (
    <div className={`border rounded-sm overflow-hidden transition-all ${locked ? "border-outline/20 opacity-50" : `${accent.border} hover:${accent.bg}`}`}>
      <button
        onClick={() => !locked && setOpen(o => !o)}
        disabled={locked}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        {MODULE_STATUS_ICON[mod.status]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${locked ? "text-slate-500" : "text-on-surface"}`}>{mod.title}</span>
            {mod.linkedExam && (
              <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${accent.badge}`}>
                {mod.linkedExam}
              </span>
            )}
            {mod.badgeOnComplete && mod.status === "complete" && (
              <span className="text-[9px] uppercase font-bold tracking-widest border border-arcana-success/30 text-arcana-success bg-arcana-success/5 px-2 py-0.5 rounded-sm">
                {mod.badgeOnComplete}
              </span>
            )}
          </div>
          {!locked && mod.status !== "complete" && (
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex-1 max-w-[140px] bg-outline/20 h-1 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${accent.bar} ${accent.glow}`} style={{ width: `${mod.progressPct}%` }} />
              </div>
              <span className="text-[10px] text-secondary font-mono">{doneLessons}/{mod.lessons.length} lessons</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-mono">{mod.estimatedHours}h est.</div>
          {!locked && (
            <ChevronRight className={`size-4 text-secondary ml-auto transition-transform ${open ? "rotate-90" : ""}`} />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-outline/20 px-4 pb-4 pt-3 space-y-2">
          {mod.lessons.map((lesson) => (
            <div key={lesson.title} className="flex items-center gap-2.5">
              {lesson.done
                ? <CheckCircle2 className="size-3.5 text-arcana-success shrink-0" />
                : <Circle className="size-3.5 text-slate-600 shrink-0" />}
              <span className={`text-xs leading-snug ${lesson.done ? "line-through text-slate-500" : "text-secondary"}`}>{lesson.title}</span>
            </div>
          ))}
          {mod.status === "available" && (
            <button className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold border rounded-sm transition-colors ${accent.border} ${accent.bg} ${accent.text} hover:opacity-80`}>
              <Zap className="size-3" /> Begin Module
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseCard({ phase }: { phase: Phase }) {
  const [expanded, setExpanded] = useState(phase.status === "active");
  const accent = ACCENT[phase.accentColor];
  const locked = phase.status === "locked";

  return (
    <div className={`border rounded-sm overflow-hidden transition-all ${locked ? "border-outline/30 opacity-60" : accent.border}`}>
      {/* Phase Header */}
      <button
        onClick={() => !locked && setExpanded(e => !e)}
        disabled={locked}
        className={`w-full flex items-center gap-5 p-5 text-left transition-colors ${!locked && `hover:${accent.bg}`}`}
      >
        <div className={`size-10 rounded-sm border flex items-center justify-center shrink-0 font-headline text-lg font-light ${locked ? "border-outline/30 text-slate-600 bg-surface-container/30" : `${accent.border} ${accent.text} ${accent.bg}`}`}>
          {phase.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`font-headline text-lg font-light ${locked ? "text-slate-500" : "text-on-surface"}`}>{phase.title}</span>
            {phase.status === "complete" && <CheckCircle2 className="size-4 text-arcana-success" />}
            {locked && <Lock className="size-3.5 text-slate-600" />}
          </div>
          <div className="text-[10px] text-secondary uppercase tracking-widest font-medium">{phase.subtitle}</div>
          {!locked && (
            <div className="flex items-center gap-3 mt-2">
              <div className="w-32 bg-outline/20 h-1 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${accent.bar} ${phase.completionPct > 0 ? accent.glow : ""}`} style={{ width: `${phase.completionPct}%` }} />
              </div>
              <span className={`text-xs font-mono font-bold ${accent.text}`}>{phase.completionPct}%</span>
            </div>
          )}
        </div>
        {!locked && (
          <ChevronRight className={`size-5 text-secondary shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        )}
      </button>

      {/* Modules */}
      {expanded && !locked && (
        <div className="border-t border-outline/20 p-4 space-y-3">
          {phase.modules.map((mod) => (
            <ModuleRow key={mod.id} mod={mod} accent={accent} phaseActive={phase.status === "active"} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearningRoadmapPage() {
  const totalModules = PHASES.flatMap(p => p.modules).length;
  const doneModules = PHASES.flatMap(p => p.modules).filter(m => m.status === "complete").length;
  const inProgressModules = PHASES.flatMap(p => p.modules).filter(m => m.status === "in_progress").length;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Advisor Academy
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <BookOpen className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Learning Roadmap</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          Phase-gated curriculum from client-service fundamentals through elite advisory credentialing. Each module unlocks the next tier of compensation and scope.
        </p>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-arcana-success/20 rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Modules Complete</div>
          <div className="text-2xl font-light text-arcana-success">{doneModules}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">of {totalModules} total</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">In Progress</div>
          <div className="text-2xl font-light text-primary">{inProgressModules}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">active modules</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Active Phase</div>
          <div className="text-sm font-light text-on-surface">Phase 2</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Licensing Track</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Next Unlock</div>
          <div className="text-sm font-light text-on-surface">Series 7</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
            <Award className="size-2.5" />After Series 63
          </div>
        </div>
      </div>

      {/* Phase List */}
      <div className="space-y-4">
        <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
          <BookOpen className="size-4 text-primary" /> Curriculum Phases
        </h2>
        <div className="space-y-3">
          {PHASES.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="pt-10 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <BookOpen className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">Education Disclaimer:</strong> This curriculum is for career readiness and educational orientation only. It is <span className="text-arcana-warning">not</span> a substitute for official exam prep providers, FINRA-approved coursework, or licensed training programs. Exam content and requirements must be verified directly with FINRA, NASAA, and your sponsoring firm.
        </p>
      </div>
    </div>
  );
}
