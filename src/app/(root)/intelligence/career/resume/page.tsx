"use client";

import { useState } from "react";
import { ArrowLeft, FileText, User, Briefcase, Award, Plus, Download, Sparkles, CheckCircle2, ChevronRight, Building2, DollarSign } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmploymentType = "W2" | "1099";
type ResumeTab = "profile" | "experience" | "credentials" | "preview";

interface WorkEntry {
  id: number;
  title: string;
  employer: string;
  type: EmploymentType;
  start: string;
  end: string | null;
  bullets: string[];
}

interface CredentialEntry {
  id: number;
  name: string;
  issuer: string;
  status: "active" | "in_progress" | "pending";
  date: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const WORK_ENTRIES: WorkEntry[] = [
  {
    id: 1,
    title: "Wealth Management Associate",
    employer: "First National Financial Group",
    type: "W2",
    start: "Jan 2026",
    end: null,
    bullets: [
      "Support $42M in managed client assets across 68 household accounts",
      "Coordinate client onboarding, account transfers, and annual review scheduling",
      "Co-present retirement planning analyses to HNW prospects alongside senior advisors",
    ],
  },
  {
    id: 2,
    title: "Client Service Representative",
    employer: "Meridian Credit Union",
    type: "W2",
    start: "Mar 2023",
    end: "Dec 2025",
    bullets: [
      "Processed an average of 120+ daily transactions with zero compliance infractions over 2.5 years",
      "Referred 34 members to investment services, generating $1.1M in new AUM pipeline",
      "Trained 4 incoming associates on CRM systems and member communication protocols",
    ],
  },
  {
    id: 3,
    title: "Independent Financial Literacy Coach",
    employer: "Self / 1099",
    type: "1099",
    start: "Jun 2022",
    end: "Feb 2023",
    bullets: [
      "Delivered 1-on-1 budget coaching sessions to 27 clients; avg. savings rate improvement of 18%",
      "Developed a 6-week debt elimination curriculum adopted by a local non-profit",
    ],
  },
];

const CREDENTIALS: CredentialEntry[] = [
  { id: 1, name: "Securities Industry Essentials (SIE)", issuer: "FINRA", status: "active", date: "Nov 2025" },
  { id: 2, name: "Series 63 — Uniform Securities Agent", issuer: "NASAA", status: "in_progress", date: "Jun 2026 (est.)" },
  { id: 3, name: "Series 7 — General Securities Rep", issuer: "FINRA", status: "pending", date: "Q3 2026 (est.)" },
  { id: 4, name: "Life & Health Insurance License", issuer: "State DOI", status: "active", date: "Aug 2024" },
];

const PROFILE = {
  name: "Xavier Martinez",
  target: "Financial Advisor",
  summary:
    "Career-switcher transitioning into full financial advisory through licensed wealth management. 3+ years of client-facing financial services experience across retail banking, credit unions, and independent coaching. SIE certified; actively pursuing Series 63 and Series 7. Committed to delivering fiduciary-aligned, community-centered financial guidance.",
  phone: "(555) 000-0000",
  email: "xavier@example.com",
  location: "Los Angeles, CA",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TYPE_COLOR: Record<EmploymentType, string> = {
  W2:   "text-teal-400 border-teal-400/30 bg-teal-400/5",
  "1099": "text-amber-400 border-amber-400/30 bg-amber-400/5",
};

const CRED_COLOR: Record<CredentialEntry["status"], string> = {
  active:      "text-arcana-success border-arcana-success/30 bg-arcana-success/5",
  in_progress: "text-primary border-primary/30 bg-primary/5",
  pending:     "text-secondary border-outline/40 bg-outline/5",
};

const CRED_LABEL: Record<CredentialEntry["status"], string> = {
  active: "Active", in_progress: "In Progress", pending: "Pending",
};

function ProfileTab() {
  return (
    <div className="space-y-6">
      <div className="bg-surface-container border border-outline rounded-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-8 bg-primary/10 border border-primary/20 rounded flex items-center justify-center">
            <User className="size-4 text-primary" />
          </div>
          <h3 className="font-headline text-base text-on-surface uppercase tracking-tight">Identity & Target</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Full Name", value: PROFILE.name },
            { label: "Target Role", value: PROFILE.target },
            { label: "Location", value: PROFILE.location },
            { label: "Email", value: PROFILE.email },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-1">
              <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">{label}</div>
              <div className="bg-background border border-outline/50 rounded-sm px-3 py-2 text-sm text-on-surface font-mono">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Professional Summary</div>
            <button className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-primary font-bold border border-primary/20 px-2 py-1 rounded-sm hover:bg-primary/5 transition-colors">
              <Sparkles className="size-2.5" /> AI Optimize
            </button>
          </div>
          <div className="bg-background border border-outline/50 rounded-sm px-3 py-3 text-xs text-secondary leading-relaxed min-h-[80px]">
            {PROFILE.summary}
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-primary/20 rounded-sm p-4 flex items-start gap-3">
        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-xs text-on-surface font-medium">AI Summary Insight</div>
          <p className="text-[11px] text-secondary leading-relaxed">
            Your summary positions you strongly as a career-switcher with compliance credibility. Consider adding a quantified AUM figure once you exceed $50M in supported assets — it will rank higher in ATS systems used by wirehouses.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExperienceTab() {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <div className="space-y-4">
      {WORK_ENTRIES.map((entry) => (
        <div key={entry.id} className="bg-surface-container border border-outline/60 rounded-sm overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-container-high transition-colors"
          >
            <Building2 className="size-4 text-secondary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-on-surface font-medium">{entry.title}</span>
                <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${TYPE_COLOR[entry.type]}`}>
                  {entry.type}
                </span>
              </div>
              <div className="text-[10px] text-secondary font-mono mt-0.5">
                {entry.employer} · {entry.start} — {entry.end ?? "Present"}
              </div>
            </div>
            <ChevronRight className={`size-4 text-secondary shrink-0 transition-transform ${expanded === entry.id ? "rotate-90" : ""}`} />
          </button>

          {expanded === entry.id && (
            <div className="border-t border-outline/20 px-5 pb-4 pt-3 space-y-3">
              <div className="space-y-2">
                {entry.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-secondary leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-outline/20">
                <button className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-primary font-bold border border-primary/20 px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors">
                  <Sparkles className="size-2.5" /> AI Rewrite Bullets
                </button>
                <button className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-secondary font-bold border border-outline/40 px-3 py-1.5 rounded-sm hover:border-outline transition-colors">
                  <Plus className="size-2.5" /> Add Bullet
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-outline/50 rounded-sm text-[10px] uppercase tracking-widest text-secondary hover:border-primary/30 hover:text-primary transition-colors">
        <Plus className="size-3.5" /> Add Work Entry
      </button>
    </div>
  );
}

function CredentialsTab() {
  return (
    <div className="space-y-4">
      {CREDENTIALS.map((cred) => (
        <div key={cred.id} className="bg-surface-container border border-outline/60 rounded-sm p-4 flex items-center gap-4">
          <CheckCircle2 className={`size-4 shrink-0 ${cred.status === "active" ? "text-arcana-success" : "text-secondary"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-on-surface font-medium">{cred.name}</span>
              <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${CRED_COLOR[cred.status]}`}>
                {CRED_LABEL[cred.status]}
              </span>
            </div>
            <div className="text-[10px] text-secondary font-mono mt-0.5">{cred.issuer} · {cred.date}</div>
          </div>
        </div>
      ))}

      <button className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-outline/50 rounded-sm text-[10px] uppercase tracking-widest text-secondary hover:border-primary/30 hover:text-primary transition-colors">
        <Plus className="size-3.5" /> Add Credential
      </button>
    </div>
  );
}

function PreviewTab() {
  return (
    <div className="space-y-4">
      {/* Resume preview card */}
      <div className="bg-white text-slate-900 rounded-sm border border-outline/30 p-8 shadow-lg font-sans text-[13px] leading-relaxed space-y-5">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4">
          <h2 className="text-2xl font-bold tracking-tight">{PROFILE.name}</h2>
          <div className="text-sm text-slate-600 mt-1">{PROFILE.target} · {PROFILE.location} · {PROFILE.email}</div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Professional Summary</h3>
          <p className="text-slate-700 text-[12px] leading-relaxed">{PROFILE.summary}</p>
        </div>

        {/* Experience */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Experience</h3>
          <div className="space-y-4">
            {WORK_ENTRIES.map((entry) => (
              <div key={entry.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{entry.title}</div>
                    <div className="text-[11px] text-slate-500">{entry.employer} · {entry.type}</div>
                  </div>
                  <div className="text-[11px] text-slate-500 shrink-0 ml-4">{entry.start} — {entry.end ?? "Present"}</div>
                </div>
                <ul className="mt-1.5 space-y-0.5 pl-4">
                  {entry.bullets.map((b, i) => (
                    <li key={i} className="text-[11px] text-slate-700 list-disc">{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Licenses & Credentials</h3>
          <div className="space-y-0.5">
            {CREDENTIALS.filter(c => c.status !== "pending").map((cred) => (
              <div key={cred.id} className="text-[11px] text-slate-700">
                <span className="font-medium">{cred.name}</span> — {cred.issuer} ({cred.date})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download CTA */}
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-background text-[10px] uppercase tracking-widest font-bold hover:bg-primary-container transition-colors rounded-sm shadow-[0_0_15px_rgba(197,160,89,0.3)]">
          <Download className="size-4" /> Export PDF
        </button>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-container border border-outline text-secondary text-[10px] uppercase tracking-widest font-bold hover:border-primary/30 hover:text-primary transition-colors rounded-sm">
          <FileText className="size-4" /> Copy Plain Text
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: ResumeTab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",     label: "Profile",     icon: <User className="size-3.5" /> },
  { id: "experience",  label: "Experience",  icon: <Briefcase className="size-3.5" /> },
  { id: "credentials", label: "Credentials", icon: <Award className="size-3.5" /> },
  { id: "preview",     label: "Preview",     icon: <FileText className="size-3.5" /> },
];

export default function ResumeBuilderPage() {
  const [activeTab, setActiveTab] = useState<ResumeTab>("profile");

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Trajectory Hub
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
                <FileText className="size-5" />
              </span>
              <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Resume Builder</h1>
            </div>
            <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
              Dynamic financial resume generation with W2 and 1099 profile support. AI-optimizes bullet points against ATS scoring patterns for wirehouse and RIA hiring systems.
            </p>
          </div>

          {/* W2 / 1099 toggle indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400/5 border border-teal-400/20 rounded-sm text-[9px] uppercase tracking-widest text-teal-400 font-bold">
              <DollarSign className="size-3" /> W2 Profile
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/5 border border-amber-400/20 rounded-sm text-[9px] uppercase tracking-widest text-amber-400 font-bold">
              <DollarSign className="size-3" /> 1099 Profile
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
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
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "profile"     && <ProfileTab />}
        {activeTab === "experience"  && <ExperienceTab />}
        {activeTab === "credentials" && <CredentialsTab />}
        {activeTab === "preview"     && <PreviewTab />}
      </div>

      {/* Disclaimer */}
      <div className="pt-10 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <FileText className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">Profile Disclaimer:</strong> Resume content is user-generated and AI-assisted for formatting purposes only. Arcana Pulse does <span className="text-arcana-warning">not</span> guarantee employment outcomes. All credential dates, exam statuses, and employment information must be accurate and verifiable. Misrepresentation on licensing applications or regulatory filings may result in FINRA sanctions.
        </p>
      </div>
    </div>
  );
}
