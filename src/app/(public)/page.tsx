"use client";

import {
  ArrowRight,
  Brain,
  TrendingUp,
  BarChart3,
  Shield,
  MessageSquare,
  Zap,
  CheckCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "$2.4M+", label: "Assets Tracked" },
  { value: "94%", label: "Forecast Accuracy" },
  { value: "< 3 min", label: "To First Insight" },
  { value: "Zero", label: "Conflicts of Interest" },
];

const PILLARS = [
  {
    Icon: BarChart3,
    tag: "Financial Intelligence",
    title: "Your ledger, finally legible",
    body: "Every transaction, budget, and forecast in one sovereign view. Arcana reads your financial DNA and surfaces what actually matters — before it costs you.",
    points: ["Real-time cash flow forecasting", "AI budget recommendations", "Anomaly detection & alerts"],
  },
  {
    Icon: TrendingUp,
    tag: "Career Trajectory",
    title: "Map the income you deserve",
    body: "Link your career moves to your financial outcomes. Arcana models the gap between where you are and where you should be — then builds the bridge.",
    points: ["Income optimization modeling", "Career-to-wealth correlation", "Milestone projection engine"],
  },
  {
    Icon: Brain,
    tag: "Sovereign AI",
    title: "An AI that works only for you",
    body: "No ads. No upsells. No conflicts of interest. Arcana's intelligence is calibrated to your goals alone and optimizes without compromise or distraction.",
    points: ["Private by design", "Goal-anchored recommendations", "Learns from your decisions"],
  },
];

const STEPS = [
  {
    number: "01",
    Icon: MessageSquare,
    title: "Take the AI Interview",
    body: "A 5-minute conversation that maps your financial situation, career stage, risk tolerance, and goals. The system builds your sovereign intelligence profile.",
  },
  {
    number: "02",
    Icon: Zap,
    title: "Connect Your Data",
    body: "Link accounts, income streams, and career data. Arcana synthesizes everything into a unified intelligence layer — one view of your full picture.",
  },
  {
    number: "03",
    Icon: Shield,
    title: "Start Commanding",
    body: "Receive daily briefings, proactive alerts, and AI-generated strategies. Stop reacting to your finances. Start directing your future with precision.",
  },
];

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// ─── Mock Dashboard Visual ────────────────────────────────────────────────────

function MockDashboard() {
  const bars = [38, 55, 44, 70, 52, 80, 96];
  return (
    <svg viewBox="0 0 480 300" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      {/* Card background */}
      <rect width="480" height="300" fill="#121212" rx="8" />

      {/* Top bar */}
      <rect width="480" height="34" fill="#0A0A0A" rx="8" />
      <rect y="26" width="480" height="8" fill="#0A0A0A" />
      <circle cx="16" cy="17" r="4" fill="#C5A059" opacity="0.7" />
      <rect x="28" y="12" width="64" height="10" fill="#1A1A1A" rx="2" />
      <rect x="360" y="10" width="108" height="14" fill="#1A1A1A" rx="2" />

      {/* KPI cards */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={12 + i * 116} y="46" width="108" height="48" fill="#1A1A1A" rx="4" />
          <rect x={20 + i * 116} y="52" width="44" height="6" fill="#2A2A2A" rx="1" />
          <rect
            x={20 + i * 116}
            y="64"
            width={i === 0 ? 72 : 60}
            height="12"
            fill={i === 0 ? "#C5A059" : i === 3 ? "#10b981" : "#333"}
            opacity={i === 0 ? 0.85 : 0.7}
            rx="2"
          />
          <rect x={20 + i * 116} y="82" width="48" height="5" fill="#222" rx="1" />
        </g>
      ))}

      {/* Bar chart */}
      <rect x="12" y="106" width="220" height="126" fill="#1A1A1A" rx="4" />
      <rect x="12" y="106" width="220" height="15" fill="#161616" rx="4" />
      <rect x="20" y="112" width="72" height="6" fill="#2A2A2A" rx="1" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={24 + i * 30}
          y={220 - h}
          width="20"
          height={h}
          fill={i === bars.length - 1 ? "#C5A059" : "#2A2A2A"}
          opacity={i === bars.length - 1 ? 0.9 : 0.8}
          rx="2"
        />
      ))}

      {/* Ring / alignment score */}
      <rect x="242" y="106" width="226" height="126" fill="#1A1A1A" rx="4" />
      <rect x="242" y="106" width="226" height="15" fill="#161616" rx="4" />
      <rect x="250" y="112" width="72" height="6" fill="#2A2A2A" rx="1" />
      <circle cx="310" cy="178" r="38" fill="none" stroke="#222" strokeWidth="10" />
      <circle
        cx="310"
        cy="178"
        r="38"
        fill="none"
        stroke="#C5A059"
        strokeWidth="10"
        strokeDasharray="148 90"
        strokeDashoffset="55"
        strokeLinecap="round"
      />
      <rect x="362" y="155" width="80" height="7" fill="#2A2A2A" rx="1" />
      <rect x="362" y="168" width="60" height="7" fill="#2A2A2A" rx="1" />
      <rect x="362" y="181" width="70" height="7" fill="#2A2A2A" rx="1" />
      <rect x="362" y="194" width="50" height="7" fill="#2A2A2A" rx="1" />

      {/* Transaction rows */}
      <rect x="12" y="242" width="456" height="14" fill="#1A1A1A" rx="2" />
      <rect x="20" y="246" width="80" height="6" fill="#2A2A2A" rx="1" />
      <rect x="360" y="246" width="60" height="6" fill="#C5A059" opacity="0.5" rx="1" />

      <rect x="12" y="260" width="456" height="12" fill="#161616" rx="2" />
      <rect x="20" y="264" width="64" height="5" fill="#222" rx="1" />
      <rect x="370" y="264" width="48" height="5" fill="#333" rx="1" />

      <rect x="12" y="276" width="456" height="12" fill="#1A1A1A" rx="2" />
      <rect x="20" y="280" width="72" height="5" fill="#222" rx="1" />
      <rect x="362" y="280" width="56" height="5" fill="#10b981" opacity="0.4" rx="1" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative bg-background overflow-hidden flex flex-col">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 landing-bg-gradient" />

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline/20 shadow-xl">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-black tracking-tighter text-primary uppercase font-headline">
            Arcana
          </div>
          <div className="hidden md:flex space-x-10 items-center">
            {["Intelligence", "Career", "Ledger", "Pulse"].map((item) => (
              <span
                key={item}
                className="text-sm uppercase tracking-[2px] text-secondary font-medium hover:text-primary transition-colors duration-300 cursor-pointer"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={() => router.push("/sign-in")}
              className="text-sm uppercase tracking-[2px] text-secondary font-medium hover:text-primary transition-colors hidden md:block"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="btn-metallic px-6 py-2.5 text-xs uppercase tracking-[2px] font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              Begin
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 lg:px-8 max-w-7xl mx-auto min-h-screen flex flex-col justify-center z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 space-y-8"
          >
            <span className="text-primary uppercase tracking-[4px] text-xs font-bold flex items-center gap-2">
              <Brain className="size-4" />
              Sovereign Intelligence Engine
            </span>

            <h1 className="font-headline text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] text-on-surface">
              Take full control of your{" "}
              <span className="text-primary">money</span>,{" "}
              <span className="text-secondary italic">career</span>, and{" "}
              <span className="text-primary">future</span> —{" "}
              <span className="text-on-surface/60">from one place.</span>
            </h1>

            <p className="text-secondary text-lg lg:text-xl leading-relaxed max-w-xl tracking-wide">
              Arcana Pulse fuses deep financial intelligence with career trajectory
              mapping, powered by AI that has{" "}
              <span className="text-on-surface">no agenda but yours</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className="btn-metallic px-8 py-4 font-bold text-sm uppercase tracking-[2px] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 ai-glow"
              >
                Start AI Interview
                <ArrowRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="px-8 py-4 font-bold text-sm uppercase tracking-[2px] text-secondary border border-outline hover:border-primary/40 hover:text-on-surface transition-all flex items-center justify-center"
              >
                Sign In
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              {["No credit card", "Private by design", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-secondary/60">
                  <CheckCircle className="size-3 text-primary/60" />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="lg:col-span-6 relative"
          >
            <div className="glass-panel rounded-xl p-2 border border-outline/20 shadow-2xl ai-glow relative">
              <MockDashboard />
              {/* Floating stat */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute -bottom-5 -left-5 glass-panel px-4 py-3 rounded-lg border border-outline/20 shadow-xl flex items-center gap-3"
              >
                <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="text-primary size-4" />
                </div>
                <div>
                  <div className="text-xs text-secondary uppercase tracking-widest font-bold">Net velocity</div>
                  <div className="text-lg font-bold text-on-surface">+24% this quarter</div>
                </div>
              </motion.div>
              {/* Second floating stat */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 }}
                className="absolute -top-4 -right-4 glass-panel px-3 py-2 rounded-lg border border-outline/20 shadow-xl flex items-center gap-2"
              >
                <div className="size-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-secondary uppercase tracking-widest font-bold">AI active</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="relative z-10 w-full border-y border-outline/40 bg-surface-container/60 backdrop-blur-sm">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {STATS.map(({ value, label }) => (
            <motion.div key={label} variants={fadeUp} className="text-center space-y-2">
              <div className="font-headline text-5xl font-light text-primary">{value}</div>
              <div className="text-xs uppercase tracking-[2px] text-secondary font-bold">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Three Pillars ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-28 w-full">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-16 space-y-3"
        >
          <span className="text-xs uppercase tracking-[3px] text-primary font-bold">
            Core Capabilities
          </span>
          <h2 className="font-headline text-5xl lg:text-6xl font-light text-on-surface max-w-2xl">
            Three systems. One sovereign view.
          </h2>
          <p className="text-secondary text-lg lg:text-xl max-w-xl leading-relaxed">
            Most tools give you data. Arcana gives you command.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {PILLARS.map(({ Icon, tag, title, body, points }) => (
            <motion.div
              key={tag}
              variants={fadeUp}
              className="group bg-surface-container border border-outline hover:border-primary/30 transition-colors p-8 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 border border-primary/20">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="text-xs uppercase tracking-[2px] text-primary font-bold">{tag}</span>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-2xl font-light text-on-surface leading-snug">{title}</h3>
                <p className="text-base text-secondary leading-relaxed">{body}</p>
              </div>
              <ul className="space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-secondary/80">
                    <span className="text-primary mt-px">—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Divider ── */}
      <div className="landing-divider mx-8" />

      {/* ── Problem / Contrast ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span className="text-xs uppercase tracking-[3px] text-secondary font-bold">The Problem</span>
            <h2 className="font-headline text-5xl font-light text-on-surface leading-snug">
              Your money, career, and goals are{" "}
              <span className="text-secondary italic">completely disconnected.</span>
            </h2>
            <p className="text-secondary text-lg leading-relaxed">
              You have a budgeting app. A job. Some vague financial goals. But no
              system connects them. Every tool works in a silo — none of them know
              how your income relates to your debt, or how your next promotion
              unlocks your next milestone.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              Arcana is the first platform that treats your{" "}
              <span className="text-on-surface">financial life and career as a single system</span> — and
              builds an AI that operates across both.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {[
              { before: "Spreadsheet budgets", after: "Live AI-driven forecasts" },
              { before: "Disconnected accounts", after: "One unified ledger" },
              { before: "Generic financial advice", after: "Sovereign AI for your goals only" },
              { before: "Reactive money management", after: "Proactive command & control" },
              { before: "Career and money in silos", after: "Integrated trajectory mapping" },
            ].map(({ before, after }) => (
              <motion.div
                key={before}
                variants={fadeUp}
                className="flex items-center gap-4 py-3 border-b border-outline/40 last:border-0"
              >
                <span className="flex-1 text-base text-secondary/50 line-through text-right">{before}</span>
                <ArrowRight className="size-4 text-primary/60 flex-shrink-0" />
                <span className="flex-1 text-base text-on-surface">{after}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <div className="landing-divider mx-8" />
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-28 w-full">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-16 space-y-3"
        >
          <span className="text-xs uppercase tracking-[3px] text-primary font-bold">How It Works</span>
          <h2 className="font-headline text-5xl lg:text-6xl font-light text-on-surface">
            From reactive to commanding — in three steps.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12"
        >
          {STEPS.map(({ number, Icon, title, body }, i) => (
            <motion.div key={number} variants={fadeUp} className="relative space-y-5">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(100%+1.5rem)] right-0 h-px bg-gradient-to-r from-primary/30 to-transparent w-12" />
              )}
              <div className="flex items-center gap-4">
                <span className="font-headline text-5xl font-light text-primary/30">{number}</span>
                <div className="p-2 border border-outline bg-surface-container">
                  <Icon className="size-4 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-headline text-2xl font-light text-on-surface">{title}</h3>
                <p className="text-base text-secondary leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <div className="landing-divider mx-8" />
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-28 w-full">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-surface-container border border-outline p-12 lg:p-20 relative overflow-hidden"
        >
          {/* Subtle glow */}
          <div className="absolute -top-32 -right-32 size-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-8">
            <span className="text-xs uppercase tracking-[3px] text-primary font-bold">
              Start Today
            </span>
            <h2 className="font-headline text-5xl lg:text-6xl font-light text-on-surface leading-tight">
              Five minutes to your first sovereign insight.
            </h2>
            <p className="text-secondary text-xl leading-relaxed">
              The AI interview takes less than 5 minutes. By the end, you'll have
              your first financial intelligence briefing — built exclusively for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className="btn-metallic px-10 py-4 font-bold text-sm uppercase tracking-[2px] hover:opacity-90 active:scale-95 transition-all flex items-center gap-3 ai-glow"
              >
                Start AI Interview
                <ArrowRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="px-10 py-4 font-bold text-sm uppercase tracking-[2px] text-secondary border border-outline hover:text-on-surface hover:border-outline-variant transition-all"
              >
                Already a member
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full py-12 px-8 bg-[#060606] border-t border-outline/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="space-y-2">
            <div className="text-xl font-black text-primary font-headline uppercase tracking-tighter">
              Arcana
            </div>
            <p className="text-sm text-secondary uppercase tracking-[2px] max-w-[200px] leading-relaxed">
              Sovereign financial intelligence for ambitious careers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-3">
            {[
              ["Intelligence", "Career Mapping", "Ledger", "AI Interview"],
              ["Privacy Policy", "Terms of Service", "Data Encryption", "API"],
            ].map((col, ci) => {
              const hrefs: Record<string, string> = {
                "Privacy Policy": "/privacy",
                "Terms of Service": "/terms",
              };
              return (
                <div key={ci} className="space-y-3">
                  {col.map((item) => (
                    hrefs[item] ? (
                      <a
                        key={item}
                        href={hrefs[item]}
                        className="block text-xs uppercase tracking-widest text-secondary/50 hover:text-primary transition-colors"
                      >
                        {item}
                      </a>
                    ) : (
                      <div
                        key={item}
                        className="text-xs uppercase tracking-widest text-secondary/50 hover:text-primary transition-colors cursor-pointer"
                      >
                        {item}
                      </div>
                    )
                  ))}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-right">
            <div className="text-xs uppercase tracking-widest text-secondary/40">
              © 2026 Arcana Sovereign Ledger
            </div>
            <div className="text-xs uppercase tracking-widest text-secondary/30">
              All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
