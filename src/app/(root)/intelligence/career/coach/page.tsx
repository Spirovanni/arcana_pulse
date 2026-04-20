"use client";

import { useState } from "react";
import { ArrowLeft, Bot, Zap, ChevronRight, Mic, BookOpen, Target, BarChart3, MessageSquare, CheckCircle2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

// ─── Data ────────────────────────────────────────────────────────────────────

const INSIGHTS = [
  {
    id: 1,
    tag: "Skill Gap",
    color: "teal",
    time: "2h ago",
    body: "Your Series 63 study pace puts you 11 days ahead of schedule. Recommend front-loading the Uniform Securities Act module before pivoting to state-specific regulations.",
  },
  {
    id: 2,
    tag: "Interview Prep",
    color: "primary",
    time: "Yesterday",
    body: "Based on your target firm (wirehouses + RIAs), behavioral questions on client retention and AUM growth appear in 84% of first-round screens. Queued 6 scenarios.",
  },
  {
    id: 3,
    tag: "Market Signal",
    color: "purple",
    time: "2 days ago",
    body: "Demand for bilingual financial advisors in your metro has risen 22% YoY. Your profile has an untapped language-based positioning advantage.",
  },
];

interface Question {
  id: number;
  category: string;
  difficulty: "Entry" | "Mid" | "Senior";
  prompt: string;
  keyElements: string[];
}

const INTERVIEW_QUESTIONS: Question[] = [
  {
    id: 1,
    category: "Client Acquisition",
    difficulty: "Entry",
    prompt: "Walk me through how you would build your initial book of business with no existing network.",
    keyElements: ["Referral strategy", "Cold outreach cadence", "Value proposition framing"],
  },
  {
    id: 2,
    category: "Regulatory Knowledge",
    difficulty: "Mid",
    prompt: "Explain the difference between a broker-dealer and a registered investment adviser, and when you would recommend each.",
    keyElements: ["Fiduciary vs. suitability standard", "Fee structures", "FINRA vs. SEC oversight"],
  },
  {
    id: 3,
    category: "Portfolio Construction",
    difficulty: "Mid",
    prompt: "A 42-year-old client wants to retire at 55 with $2M. Their current portfolio is 90% equities. How do you advise them?",
    keyElements: ["Risk tolerance reassessment", "Glide path strategy", "Tax-efficient rebalancing"],
  },
  {
    id: 4,
    category: "Behavioral / EQ",
    difficulty: "Entry",
    prompt: "Describe a time you had to deliver bad news to a client. How did you manage the conversation?",
    keyElements: ["Emotional acknowledgment", "Data-backed narrative", "Retention outcome"],
  },
  {
    id: 5,
    category: "Compliance",
    difficulty: "Senior",
    prompt: "A long-standing client asks you to execute a trade that you believe is not in their best interest. Walk me through your decision-making process.",
    keyElements: ["Fiduciary documentation", "Suitability analysis", "Escalation protocol"],
  },
];

const SKILL_RECS = [
  { skill: "Financial Statement Analysis", priority: "High", reason: "Appears in 91% of Series 65 prep and Sr. Advisor job requirements.", tag: "Series 65 Unlock" },
  { skill: "Client Objection Handling", priority: "High", reason: "Statistically correlated with 2.3× higher client retention in your target role cohort.", tag: "Interview Edge" },
  { skill: "Estate Planning Fundamentals", priority: "Medium", reason: "Differentiates wealth management candidates from general advisors in AUM-heavy firms.", tag: "Competitive Moat" },
  { skill: "Python / Data Literacy", priority: "Low", reason: "Emerging demand in tech-forward RIAs. Low urgency but high 5-year ceiling impact.", tag: "Future Stack" },
];

const PRIORITY_COLOR: Record<string, string> = {
  High: "text-arcana-warning border-arcana-warning/30 bg-arcana-warning/5",
  Medium: "text-primary border-primary/30 bg-primary/5",
  Low: "text-secondary border-outline/40 bg-outline/5",
};

const INSIGHT_COLOR: Record<string, string> = {
  teal: "text-teal-400 border-teal-400/30 bg-teal-400/5",
  primary: "text-primary border-primary/30 bg-primary/5",
  purple: "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Entry: "text-arcana-success border-arcana-success/30",
  Mid: "text-primary border-primary/30",
  Senior: "text-purple-400 border-purple-400/30",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InsightFeed() {
  return (
    <div className="space-y-3">
      {INSIGHTS.map((insight) => (
        <div key={insight.id} className="bg-surface-container-high border border-outline/50 rounded-sm p-4 space-y-2 hover:border-outline transition-colors">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold tracking-widest border ${INSIGHT_COLOR[insight.color]}`}>
              <Sparkles className="size-2.5" />{insight.tag}
            </span>
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Clock className="size-2.5" />{insight.time}
            </span>
          </div>
          <p className="text-xs text-secondary leading-relaxed">{insight.body}</p>
        </div>
      ))}
    </div>
  );
}

function MockInterviewPanel() {
  const [activeId, setActiveId] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {INTERVIEW_QUESTIONS.map((q) => (
        <div key={q.id} className="bg-surface-container-high border border-outline/50 rounded-sm overflow-hidden">
          <button
            onClick={() => setActiveId(activeId === q.id ? null : q.id)}
            className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${DIFFICULTY_COLOR[q.difficulty]}`}>
                {q.difficulty}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-secondary font-bold shrink-0">{q.category}</span>
              <span className="text-xs text-on-surface truncate">{q.prompt}</span>
            </div>
            <ChevronRight className={`size-4 text-secondary shrink-0 transition-transform ${activeId === q.id ? "rotate-90" : ""}`} />
          </button>

          {activeId === q.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-outline/30">
              <p className="text-sm text-on-surface leading-relaxed pt-3 italic">"{q.prompt}"</p>
              <div className="space-y-1.5">
                <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Key Elements to Address</div>
                {q.keyElements.map((el) => (
                  <div key={el} className="flex items-center gap-2 text-xs text-secondary">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0" />{el}
                  </div>
                ))}
              </div>
              <button className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-[10px] uppercase tracking-widest font-bold border border-primary/20 rounded-sm hover:bg-primary/20 transition-colors">
                <Mic className="size-3" /> Practice Answer
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillGapPanel() {
  return (
    <div className="space-y-3">
      {SKILL_RECS.map((rec) => (
        <div key={rec.skill} className="bg-surface-container-high border border-outline/50 rounded-sm p-4 flex items-start gap-4 hover:border-outline transition-colors">
          <BookOpen className="size-4 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-on-surface font-medium">{rec.skill}</span>
              <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${PRIORITY_COLOR[rec.priority]}`}>
                {rec.priority}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold border border-slate-500/20 px-2 py-0.5 rounded-sm">
                {rec.tag}
              </span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">{rec.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "insights" | "interview" | "skills";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "insights", label: "AI Insights", icon: <Sparkles className="size-3.5" /> },
  { id: "interview", label: "Mock Interviews", icon: <MessageSquare className="size-3.5" /> },
  { id: "skills", label: "Skill Gaps", icon: <BarChart3 className="size-3.5" /> },
];

export default function AICareerCoachPage() {
  const [activeTab, setActiveTab] = useState<Tab>("insights");

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Advisor Academy
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
            <Bot className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">AI Career Coach</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          Predictive coaching calibrated to your active pathway. Surfaces skill gaps, queues mock interview scenarios, and generates real-time insights as your market position evolves.
        </p>
      </header>

      {/* Coach Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-primary/20 rounded-sm p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1 relative z-10">Active Pathway</div>
          <div className="text-sm font-light text-primary relative z-10">Financial Advisor</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 relative z-10">Month 4 of 12</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Sessions Run</div>
          <div className="text-2xl font-light text-on-surface">14</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">this quarter</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Goals Met</div>
          <div className="text-2xl font-light text-arcana-success">6</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">of 8 set</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Next Session</div>
          <div className="text-sm font-light text-on-surface">Interview Sim</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1"><Clock className="size-2.5" />Queued</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="space-y-6">
        {/* Tab Bar */}
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

          <div className="ml-auto flex items-center gap-2 pb-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/20 rounded-sm text-[9px] uppercase tracking-widest text-primary font-bold">
              <Zap className="size-3" /> Coach Active
              <div className="size-1.5 rounded-full bg-primary animate-pulse ml-1" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "insights" && <InsightFeed />}
          {activeTab === "interview" && <MockInterviewPanel />}
          {activeTab === "skills" && <SkillGapPanel />}
        </div>

        {/* Start Full Session CTA */}
        <div className="pt-4 flex justify-center">
          <button className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-background text-xs uppercase tracking-widest font-bold hover:bg-primary-container transition-colors rounded-sm shadow-[0_0_20px_rgba(197,160,89,0.3)]">
            <Target className="size-4" /> Initialize Full Coaching Session
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="pt-10 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <Bot className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">AI Coaching Disclaimer:</strong> All coaching insights, interview feedback, and skill recommendations are AI-generated for career readiness purposes only. They do <span className="text-arcana-warning">not</span> constitute legal, licensing, or investment advice. Always verify exam requirements, firm-specific hiring criteria, and regulatory standards directly with official sources.
        </p>
      </div>
    </div>
  );
}
