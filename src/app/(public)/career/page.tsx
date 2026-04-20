"use client";

import {
  ArrowRight,
  ArrowLeft,
  Brain,
  Award,
  BookOpen,
  FileText,
  MessageSquare,
  Users,
  Building2,
  Briefcase,
  Target,
  CheckCircle,
  Zap,
  GraduationCap,
  TrendingUp,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    icon: Award,
    color: "primary",
    title: "Licensing Readiness",
    body: "SIE, Series 7, Series 63, Series 65, and CFA track with AI-paced study plans, mock exams, and pass-rate predictions.",
    href: "/intelligence/career/licensing",
    tag: "Certifications",
  },
  {
    icon: BookOpen,
    color: "teal",
    title: "Learning Roadmap",
    body: "Four-phase curriculum mapping foundational knowledge through advanced fiduciary practice. Unlock modules as you progress.",
    href: "/intelligence/career/roadmap",
    tag: "Curriculum",
  },
  {
    icon: Brain,
    color: "blue",
    title: "AI Career Coach",
    body: "Real-time market intelligence, mock interview simulations, and personalized skill-gap analysis calibrated to your exact profile.",
    href: "/intelligence/career/coach",
    tag: "AI-Powered",
  },
  {
    icon: FileText,
    color: "purple",
    title: "Resume Builder",
    body: "Build a financial services–optimized resume from your live career data. Export-ready, ATS-compatible, credential-verified.",
    href: "/intelligence/career/resume",
    tag: "Career Tools",
  },
  {
    icon: Building2,
    color: "primary",
    title: "Job Placement Pipeline",
    body: "AI-matched roles from employer hiring ledgers routed directly to you. Track every application from first contact to offer.",
    href: "/intelligence/career/placement",
    tag: "Placement",
  },
  {
    icon: Users,
    color: "indigo",
    title: "Community Network",
    body: "Connect with licensed advisors, mentors, and peers on the same path. Study groups, referral rings, and industry events.",
    href: "/intelligence/career/network",
    tag: "Network",
  },
];

const PATHWAYS = [
  "Financial Advisor",
  "Registered Representative",
  "Wealth Management Associate",
  "Client Relationship Associate",
  "Insurance / Retirement Planning",
  "Financial Coach",
  "Credit Union Member Advisor",
  "Community Financial Navigator",
];

const STATS = [
  { value: "89%", label: "Licensing Pass Rate" },
  { value: "< 90 Days", label: "Avg. Time to First Role" },
  { value: "1.8×", label: "Income Uplift w/ Series 7" },
  { value: "2,400+", label: "Active Academy Members" },
];

const OUTCOMES = [
  { before: "Scattered study materials", after: "Structured AI-paced curriculum" },
  { before: "No job market visibility", after: "Direct employer placement pipeline" },
  { before: "Career decisions made alone", after: "AI coach + peer mentor network" },
  { before: "Generic resume templates", after: "Credential-verified financial services resume" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  primary: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary", glow: "group-hover:bg-primary/10" },
  teal:    { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400", glow: "group-hover:bg-teal-500/10" },
  blue:    { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", glow: "group-hover:bg-blue-500/10" },
  purple:  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", glow: "group-hover:bg-purple-500/10" },
  indigo:  { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", glow: "group-hover:bg-indigo-500/10" },
};

export default function CareerPublicPage() {
  const router = useRouter();

  return (
    <div className="relative bg-background overflow-hidden flex flex-col min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0 landing-bg-gradient" />

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline/20 shadow-xl">
        <div className="flex justify-between items-center w-full px-8 lg:px-16 py-4 max-w-screen-2xl mx-auto">
          <Link href="/" className="text-2xl font-black tracking-tighter text-primary uppercase font-headline">
            Arcana
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs uppercase tracking-[2px] text-secondary hover:text-primary transition-colors flex items-center gap-1.5">
              <ArrowLeft className="size-3" /> Back to Home
            </Link>
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
              Enroll Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-8 lg:px-16 max-w-7xl mx-auto z-10 w-full">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="max-w-4xl"
        >
          <motion.span variants={fadeUp} className="text-primary uppercase tracking-[4px] text-xs font-bold flex items-center gap-2 mb-6">
            <Brain className="size-4" />
            Arcana Advisor Academy
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="font-headline text-5xl lg:text-[3.5rem] font-light tracking-tight leading-[1.05] text-on-surface mb-6"
          >
            Your path to{" "}
            <span className="text-primary">licensed</span> financial{" "}
            <span className="text-secondary italic">advisory</span>{" "}
            <span className="text-on-surface/60">starts here.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-secondary text-base lg:text-lg leading-relaxed max-w-2xl tracking-wide mb-10"
          >
            The only career platform built specifically for aspiring financial advisors.
            Structured licensing prep, AI coaching, employer placement, and a peer network —
            all calibrated to your exact career stage.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="btn-metallic px-8 py-4 font-bold text-sm uppercase tracking-[2px] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 ai-glow"
            >
              Start Your Academy Path
              <ArrowRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/intelligence/career")}
              className="px-8 py-4 font-bold text-sm uppercase tracking-[2px] text-secondary border border-outline hover:border-primary/40 hover:text-on-surface transition-all flex items-center justify-center gap-2"
            >
              <GraduationCap className="size-4" />
              Enter Academy
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-6 pt-6">
            {["No credit card required", "All career stages welcome", "FINRA-aligned curriculum"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-secondary/60">
                <CheckCircle className="size-3 text-primary/60" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative z-10 border-y border-outline/20 glass-panel">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-3xl font-headline font-light text-primary tracking-tight">{s.value}</p>
              <p className="text-xs uppercase tracking-widest text-secondary mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Supported Pathways ── */}
      <section className="relative z-10 py-20 px-8 lg:px-16 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-primary uppercase tracking-[4px] text-xs font-bold flex items-center gap-2 mb-4">
            <Target className="size-4" />
            Supported Pathways
          </motion.p>
          <motion.h2 variants={fadeUp} className="font-headline text-3xl lg:text-4xl font-light text-on-surface tracking-tight mb-4">
            Built for where you want to go.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-secondary text-sm leading-relaxed max-w-2xl mb-10">
            Whether you're entering financial services for the first time or pivoting from another industry,
            the Academy maps your exact route to a licensed advisory career.
          </motion.p>
          <motion.div variants={stagger} className="flex flex-wrap gap-3">
            {PATHWAYS.map((path) => (
              <motion.div
                key={path}
                variants={fadeUp}
                className="px-4 py-2 rounded-sm bg-surface-container border border-outline/50 text-xs text-slate-300 font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors cursor-default"
              >
                {path}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Module Grid ── */}
      <section className="relative z-10 py-20 px-8 lg:px-16 max-w-7xl mx-auto w-full border-t border-outline/20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-primary uppercase tracking-[4px] text-xs font-bold flex items-center gap-2 mb-4">
            <Zap className="size-4" />
            What's Inside
          </motion.p>
          <motion.h2 variants={fadeUp} className="font-headline text-3xl lg:text-4xl font-light text-on-surface tracking-tight mb-12">
            Six modules. One complete system.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const c = COLOR_MAP[mod.color];
              return (
                <motion.div
                  key={mod.title}
                  variants={fadeUp}
                  className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => router.push(mod.href)}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-10 -mt-10 rounded-full transition-all ${c.bg} ${c.glow}`} />
                  <div className="flex items-start justify-between mb-5 relative">
                    <div className={`size-10 rounded flex items-center justify-center ${c.bg} border ${c.border}`}>
                      <Icon className={`size-5 ${c.text}`} />
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm ${c.bg} ${c.text} border ${c.border}`}>
                      {mod.tag}
                    </span>
                  </div>
                  <h3 className="text-on-surface font-headline font-medium text-lg mb-2 relative">{mod.title}</h3>
                  <p className="text-secondary text-xs leading-relaxed mb-5 relative">{mod.body}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${c.text} flex items-center gap-1 group-hover:gap-2 transition-all relative`}>
                    Explore Module <ArrowRight className="size-3" />
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── Before / After ── */}
      <section className="relative z-10 py-20 px-8 lg:px-16 border-t border-outline/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-primary uppercase tracking-[4px] text-xs font-bold flex items-center gap-2 mb-4">
              <TrendingUp className="size-4" />
              The Difference
            </motion.p>
            <motion.h2 variants={fadeUp} className="font-headline text-3xl lg:text-4xl font-light text-on-surface tracking-tight mb-12">
              From scattered to sovereign.
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              {OUTCOMES.map((o, i) => (
                <motion.div key={i} variants={fadeUp} className="grid grid-cols-2 gap-px">
                  <div className="bg-surface-container border border-outline/40 rounded-sm p-4">
                    <p className="text-[9px] uppercase tracking-widest text-secondary/50 font-bold mb-2">Before</p>
                    <p className="text-sm text-secondary/80 leading-relaxed">{o.before}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-sm p-4">
                    <p className="text-[9px] uppercase tracking-widest text-primary/60 font-bold mb-2">After</p>
                    <p className="text-sm text-on-surface leading-relaxed">{o.after}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonial / Social Proof ── */}
      <section className="relative z-10 py-20 px-8 lg:px-16 border-t border-outline/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass-panel border border-primary/20 rounded-sm p-10 max-w-3xl mx-auto text-center"
          >
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-4 text-primary fill-primary" />
              ))}
            </div>
            <p className="text-on-surface font-headline text-xl font-light leading-relaxed mb-6 italic">
              "Passed my Series 63 on the first attempt. The AI study plan knew exactly which topics I was weak on
              and adjusted daily. I had an offer within 6 weeks of licensing."
            </p>
            <div>
              <p className="text-sm font-medium text-on-surface">M. Torres</p>
              <p className="text-xs text-secondary mt-0.5 uppercase tracking-widest">Wealth Management Associate · Enrolled 2025</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-8 lg:px-16 border-t border-outline/20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-6">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary uppercase tracking-[4px] text-xs font-bold">Enrollment Open</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-headline text-4xl lg:text-5xl font-light text-on-surface tracking-tight mb-6">
              Your advisory career<br />
              <span className="text-primary">starts today.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-secondary text-base leading-relaxed max-w-xl mx-auto mb-10">
              Join over 2,400 aspiring advisors using the only platform that integrates licensing,
              career coaching, and financial intelligence in one sovereign system.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className="btn-metallic px-10 py-4 font-bold text-sm uppercase tracking-[2px] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 ai-glow"
              >
                Enroll Free
                <ArrowRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/intelligence/career")}
                className="px-10 py-4 font-bold text-sm uppercase tracking-[2px] text-secondary border border-outline hover:border-primary/40 hover:text-on-surface transition-all flex items-center justify-center gap-2"
              >
                <Briefcase className="size-4" />
                Preview the Academy
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-outline/20 py-10 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black tracking-tighter text-primary uppercase font-headline">
            Arcana
          </Link>
          <p className="text-xs text-secondary/50 uppercase tracking-widest">
            © 2026 Arcana Sovereign Intelligence Group
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-xs text-secondary/50 hover:text-secondary transition-colors uppercase tracking-wider">Terms</Link>
            <Link href="/privacy" className="text-xs text-secondary/50 hover:text-secondary transition-colors uppercase tracking-wider">Privacy</Link>
            <Link href="/sign-in" className="text-xs text-secondary/50 hover:text-secondary transition-colors uppercase tracking-wider">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
