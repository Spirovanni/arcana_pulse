"use client";

import { useState } from "react";
import { ArrowLeft, Building2, MapPin, DollarSign, Zap, ChevronRight, CheckCircle2, Clock, Circle, Send, Star, Filter, Users } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStage = "applied" | "screen" | "interview" | "offer" | "closed";

interface JobMatch {
  id: number;
  title: string;
  firm: string;
  firmType: "Wirehouse" | "RIA" | "Credit Union" | "Bank" | "Insurance";
  location: string;
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  matchScore: number;
  tags: string[];
  posted: string;
  applied: boolean;
}

interface Application {
  id: number;
  title: string;
  firm: string;
  stage: AppStage;
  lastActivity: string;
  nextStep: string;
}

interface EmployerEntry {
  id: number;
  name: string;
  type: string;
  openRoles: number;
  aum: string;
  location: string;
  hiringFrom: string[];
  recruiting: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const JOBS: JobMatch[] = [
  {
    id: 1,
    title: "Associate Financial Advisor",
    firm: "Meridian Wealth Partners",
    firmType: "RIA",
    location: "Los Angeles, CA",
    remote: true,
    salaryMin: 72000,
    salaryMax: 95000,
    matchScore: 94,
    tags: ["Series 63 Required", "Series 7 Preferred", "Entry-Level Welcome"],
    posted: "2 days ago",
    applied: false,
  },
  {
    id: 2,
    title: "Wealth Management Associate",
    firm: "Pacific Coast Advisory Group",
    firmType: "RIA",
    location: "San Diego, CA",
    remote: false,
    salaryMin: 68000,
    salaryMax: 88000,
    matchScore: 89,
    tags: ["SIE Required", "Series 7 Preferred", "Client-Facing"],
    posted: "5 days ago",
    applied: false,
  },
  {
    id: 3,
    title: "Client Relationship Advisor",
    firm: "First National Financial",
    firmType: "Wirehouse",
    location: "Los Angeles, CA",
    remote: false,
    salaryMin: 65000,
    salaryMax: 85000,
    matchScore: 87,
    tags: ["Series 63 Required", "W2 Only", "Training Program"],
    posted: "1 week ago",
    applied: true,
  },
  {
    id: 4,
    title: "Community Financial Advisor",
    firm: "Cerritos Community Credit Union",
    firmType: "Credit Union",
    location: "Cerritos, CA",
    remote: false,
    salaryMin: 58000,
    salaryMax: 74000,
    matchScore: 82,
    tags: ["SIE Preferred", "Bilingual Bonus", "Mission-Aligned"],
    posted: "3 days ago",
    applied: false,
  },
  {
    id: 5,
    title: "Financial Services Representative",
    firm: "Arcadia Bancorp",
    firmType: "Bank",
    location: "Pasadena, CA",
    remote: false,
    salaryMin: 55000,
    salaryMax: 70000,
    matchScore: 76,
    tags: ["No License Required", "Sponsorship Available", "Growth Path"],
    posted: "2 weeks ago",
    applied: false,
  },
];

const APPLICATIONS: Application[] = [
  {
    id: 1,
    title: "Client Relationship Advisor",
    firm: "First National Financial",
    stage: "interview",
    lastActivity: "Apr 17",
    nextStep: "2nd Round Interview — Apr 24",
  },
  {
    id: 2,
    title: "Financial Planning Assistant",
    firm: "Horizon Wealth Mgmt",
    stage: "screen",
    lastActivity: "Apr 15",
    nextStep: "Phone screen scheduled — Apr 21",
  },
  {
    id: 3,
    title: "Associate Advisor",
    firm: "Summit Financial Group",
    stage: "applied",
    lastActivity: "Apr 12",
    nextStep: "Awaiting response",
  },
  {
    id: 4,
    title: "Retirement Planning Specialist",
    firm: "Legacy Benefits Co.",
    stage: "closed",
    lastActivity: "Apr 8",
    nextStep: "Position filled",
  },
];

const EMPLOYERS: EmployerEntry[] = [
  {
    id: 1,
    name: "Meridian Wealth Partners",
    type: "RIA",
    openRoles: 3,
    aum: "$2.1B",
    location: "Los Angeles, CA",
    hiringFrom: ["Series 63", "Series 7", "SIE"],
    recruiting: true,
  },
  {
    id: 2,
    name: "Pacific Coast Advisory Group",
    type: "RIA",
    openRoles: 2,
    aum: "$840M",
    location: "San Diego, CA",
    hiringFrom: ["Series 7", "CFP Candidates"],
    recruiting: true,
  },
  {
    id: 3,
    name: "Cerritos Community Credit Union",
    type: "Credit Union",
    openRoles: 4,
    aum: "$310M",
    location: "Cerritos, CA",
    hiringFrom: ["SIE", "No License (Sponsorship)"],
    recruiting: true,
  },
  {
    id: 4,
    name: "First National Financial",
    type: "Wirehouse",
    openRoles: 6,
    aum: "$18B",
    location: "Los Angeles, CA",
    hiringFrom: ["Series 7", "Series 63", "Series 66"],
    recruiting: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIRM_TYPE_COLOR: Record<JobMatch["firmType"], string> = {
  RIA:          "text-teal-400 border-teal-400/30 bg-teal-400/5",
  Wirehouse:    "text-primary border-primary/30 bg-primary/5",
  "Credit Union": "text-arcana-sky border-arcana-sky/30 bg-arcana-sky/5",
  Bank:         "text-secondary border-outline/40 bg-outline/5",
  Insurance:    "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

const STAGE_META: Record<AppStage, { label: string; color: string; icon: React.ReactNode; order: number }> = {
  applied:   { label: "Applied",   color: "text-secondary",       icon: <Send className="size-3" />,         order: 1 },
  screen:    { label: "Screening", color: "text-primary",         icon: <Clock className="size-3" />,        order: 2 },
  interview: { label: "Interview", color: "text-teal-400",        icon: <Users className="size-3" />,        order: 3 },
  offer:     { label: "Offer",     color: "text-arcana-success",  icon: <Star className="size-3" />,         order: 4 },
  closed:    { label: "Closed",    color: "text-slate-600",       icon: <Circle className="size-3" />,       order: 0 },
};

const PIPELINE_STAGES: AppStage[] = ["applied", "screen", "interview", "offer"];

function matchScoreColor(score: number) {
  if (score >= 90) return "text-arcana-success";
  if (score >= 80) return "text-primary";
  return "text-secondary";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobMatch }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-surface-container-high border rounded-sm overflow-hidden transition-all ${job.applied ? "border-primary/20" : "border-outline/50 hover:border-outline"}`}>
      <div className="p-5 flex items-start gap-4">
        {/* Match score */}
        <div className="shrink-0 text-center pt-0.5">
          <div className={`text-xl font-light font-mono ${matchScoreColor(job.matchScore)}`}>{job.matchScore}%</div>
          <div className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Match</div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-on-surface">{job.title}</span>
              {job.applied && (
                <span className="text-[9px] uppercase font-bold tracking-widest border border-primary/30 text-primary bg-primary/5 px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <CheckCircle2 className="size-2.5" /> Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-secondary font-medium">{job.firm}</span>
              <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${FIRM_TYPE_COLOR[job.firmType]}`}>
                {job.firmType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="size-3" />{job.location}{job.remote && " · Remote OK"}</span>
            <span className="flex items-center gap-1 font-mono">
              <DollarSign className="size-3" />{(job.salaryMin / 1000).toFixed(0)}k – {(job.salaryMax / 1000).toFixed(0)}k
            </span>
            <span className="flex items-center gap-1"><Clock className="size-3" />{job.posted}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span key={tag} className="text-[9px] uppercase font-bold tracking-widest border border-outline/40 text-slate-500 px-2 py-0.5 rounded-sm">{tag}</span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {!job.applied && (
            <button className="px-4 py-1.5 bg-primary text-background text-[9px] uppercase tracking-widest font-bold rounded-sm hover:bg-primary-container transition-colors shadow-[0_0_10px_rgba(197,160,89,0.2)] whitespace-nowrap">
              Quick Apply
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="px-4 py-1.5 border border-outline/50 text-secondary text-[9px] uppercase tracking-widest font-bold rounded-sm hover:border-primary/30 hover:text-primary transition-colors"
          >
            {expanded ? "Less" : "Details"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-outline/20 px-5 py-4 space-y-3 bg-surface-container/50">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Why This Match</div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-secondary"><CheckCircle2 className="size-3.5 text-arcana-success mt-0.5 shrink-0" />Your SIE credential meets the base licensing requirement</li>
            <li className="flex items-start gap-2 text-xs text-secondary"><CheckCircle2 className="size-3.5 text-arcana-success mt-0.5 shrink-0" />Client service experience at Meridian CU directly maps to this role scope</li>
            <li className="flex items-start gap-2 text-xs text-secondary"><CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />Series 63 in-progress — flag as pending on application</li>
          </ul>
          <Link href="/intelligence/career/resume" className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-primary font-bold hover:text-primary-container transition-colors">
            <ChevronRight className="size-3" /> Review Resume Before Applying
          </Link>
        </div>
      )}
    </div>
  );
}

function PipelineTracker() {
  const active = APPLICATIONS.filter(a => a.stage !== "closed");
  const closed = APPLICATIONS.filter(a => a.stage === "closed");

  return (
    <div className="space-y-5">
      {/* Stage progress bar */}
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((stage, i) => {
          const meta = STAGE_META[stage];
          const count = APPLICATIONS.filter(a => a.stage === stage).length;
          return (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1">
              <div className={`text-[9px] uppercase tracking-widest font-bold ${meta.color}`}>{meta.label}</div>
              <div className={`w-full h-1 ${count > 0 ? (stage === "offer" ? "bg-arcana-success" : stage === "interview" ? "bg-teal-400" : stage === "screen" ? "bg-primary" : "bg-secondary/40") : "bg-outline/20"}`} />
              <div className={`text-xs font-mono font-bold ${meta.color}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Active applications */}
      <div className="space-y-2">
        {active.map((app) => {
          const meta = STAGE_META[app.stage];
          return (
            <div key={app.id} className="bg-surface-container-high border border-outline/50 rounded-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-on-surface font-medium">{app.title}</div>
                  <div className="text-[10px] text-secondary font-mono mt-0.5">{app.firm}</div>
                </div>
                <span className={`inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm shrink-0 border-current/30 ${meta.color}`}>
                  {meta.icon}{meta.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Clock className="size-2.5" /> Last activity: {app.lastActivity}</span>
                <span className="text-primary font-medium">{app.nextStep}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed */}
      {closed.length > 0 && (
        <div className="space-y-2 opacity-50">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Closed</div>
          {closed.map((app) => (
            <div key={app.id} className="bg-surface-container border border-outline/30 rounded-sm p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">{app.title} · {app.firm}</div>
                <div className="text-[10px] text-slate-600 font-mono">{app.nextStep}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployerLedger() {
  return (
    <div className="space-y-3">
      {EMPLOYERS.map((emp) => (
        <div key={emp.id} className={`bg-surface-container-high border rounded-sm p-5 transition-colors ${emp.recruiting ? "border-outline/60 hover:border-primary/20" : "border-outline/30 opacity-60"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-on-surface font-medium">{emp.name}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest border border-outline/40 text-secondary px-2 py-0.5 rounded-sm">{emp.type}</span>
                {emp.recruiting && (
                  <span className="text-[9px] uppercase font-bold tracking-widest border border-teal-400/30 text-teal-400 bg-teal-400/5 px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <div className="size-1.5 rounded-full bg-teal-400 animate-pulse" /> Actively Recruiting
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap font-mono">
                <span className="flex items-center gap-1"><MapPin className="size-2.5" />{emp.location}</span>
                <span className="flex items-center gap-1"><DollarSign className="size-2.5" />{emp.aum} AUM</span>
                <span className="flex items-center gap-1"><Building2 className="size-2.5" />{emp.openRoles} open role{emp.openRoles !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Hiring For</div>
              <div className="flex flex-col gap-1 items-end">
                {emp.hiringFrom.map((h) => (
                  <span key={h} className="text-[9px] text-primary font-mono border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-sm">{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PlacementTab = "matches" | "pipeline" | "employers";

const TABS: { id: PlacementTab; label: string; icon: React.ReactNode }[] = [
  { id: "matches",   label: "Job Matches",      icon: <Zap className="size-3.5" /> },
  { id: "pipeline",  label: "My Pipeline",      icon: <Send className="size-3.5" /> },
  { id: "employers", label: "Employer Ledger",  icon: <Building2 className="size-3.5" /> },
];

export default function PlacementPipelinePage() {
  const [activeTab, setActiveTab] = useState<PlacementTab>("matches");
  const [filter, setFilter] = useState<"all" | "riai" | "wirehouse">("all");

  const filteredJobs = JOBS.filter(j => {
    if (filter === "riai") return j.firmType === "RIA";
    if (filter === "wirehouse") return j.firmType === "Wirehouse";
    return true;
  });

  const topMatch = JOBS.reduce((a, b) => a.matchScore > b.matchScore ? a : b);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Advisor Academy
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <Building2 className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Job Placement Pipeline</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          AI-matched financial advisory roles routed directly from employer hiring ledgers. Track applications from first contact to offer.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-primary/20 rounded-sm p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1 relative z-10">Top Match</div>
          <div className="text-2xl font-light text-primary relative z-10">{topMatch.matchScore}%</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 relative z-10 truncate">{topMatch.firm}</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Active Matches</div>
          <div className="text-2xl font-light text-on-surface">{JOBS.length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">in your range</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">In Progress</div>
          <div className="text-2xl font-light text-teal-400">{APPLICATIONS.filter(a => a.stage !== "closed").length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">applications</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Recruiting Firms</div>
          <div className="text-2xl font-light text-on-surface">{EMPLOYERS.filter(e => e.recruiting).length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">in Arcana ledger</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline/30">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-on-surface"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}

        {activeTab === "matches" && (
          <div className="ml-auto flex items-center gap-2 pb-2">
            <Filter className="size-3.5 text-secondary" />
            {(["all", "riai", "wirehouse"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm border transition-colors ${
                  filter === f
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-outline/40 text-secondary hover:border-outline"
                }`}
              >
                {f === "all" ? "All" : f === "riai" ? "RIA" : "Wirehouse"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {activeTab === "matches"   && filteredJobs.map(j => <JobCard key={j.id} job={j} />)}
        {activeTab === "pipeline"  && <PipelineTracker />}
        {activeTab === "employers" && <EmployerLedger />}
      </div>

      {/* Disclaimer */}
      <div className="pt-10 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <Building2 className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">Placement Disclaimer:</strong> Job matches and employer listings are generated for career readiness purposes and do <span className="text-arcana-warning">not</span> constitute confirmed job offers or guaranteed placement. Compensation ranges are estimates based on market data. All licensing requirements must be verified directly with the hiring firm and FINRA/NASAA before applying.
        </p>
      </div>
    </div>
  );
}
