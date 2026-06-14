"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Zap, Users, Star, ArrowRight, Shield, RefreshCw, Headphones } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import type { PlanId } from "@/lib/stripe";

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  starter: <Star className="w-5 h-5" />,
  pro: <Zap className="w-5 h-5" />,
  team: <Users className="w-5 h-5" />,
};

const PLAN_GRADIENTS: Record<PlanId, string> = {
  starter: "from-slate-500/20 to-slate-600/10",
  pro: "from-primary/20 to-primary/5",
  team: "from-violet-500/20 to-violet-600/5",
};

const TRUST_ITEMS = [
  { icon: Shield, label: "Bank-grade encryption", sub: "256-bit AES at rest and in transit" },
  { icon: RefreshCw, label: "Cancel anytime", sub: "No lock-in, no cancellation fees" },
  { icon: Headphones, label: "Live support", sub: "Priority email and chat for paid plans" },
];

const FAQ = [
  {
    q: "Can I switch plans later?",
    a: "Yes — upgrade or downgrade at any time. Upgrades are prorated immediately. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "What counts as a 'connected bank account'?",
    a: "Any financial institution you link via Plaid. The Starter plan allows one active connection; Pro and Team plans are unlimited.",
  },
  {
    q: "Are AI insights available offline?",
    a: "AI insights require an active Pro or Team subscription and a live internet connection to generate in real time.",
  },
  {
    q: "Does the free plan ever expire?",
    a: "No. Starter is free forever. You only pay if you decide you need more power.",
  },
  {
    q: "How is the Team plan billed?",
    a: "Team is billed per workspace, not per seat. Up to 10 members share one subscription at $29 / month.",
  },
];

const ANNUAL_DISCOUNT = 0.20; // 20% off

function getDisplayPrice(monthlyPrice: number, annual: boolean): { amount: number; label: string; savings?: string } {
  if (monthlyPrice === 0) return { amount: 0, label: "Free" };
  if (!annual) return { amount: monthlyPrice / 100, label: `$${monthlyPrice / 100}` };
  const discounted = Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT)) / 100;
  const yearlyTotal = Math.round(discounted * 12);
  return {
    amount: discounted,
    label: `$${discounted.toFixed(0)}`,
    savings: `$${yearlyTotal}/yr — save $${Math.round((monthlyPrice / 100) * 12 - yearlyTotal)}`,
  };
}

export default function PricingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen text-on-surface overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 landing-bg-gradient" />

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline/20 shadow-xl">
        <div className="flex justify-between items-center w-full px-8 lg:px-16 py-4 max-w-screen-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-2xl font-black tracking-tighter text-primary uppercase font-headline"
          >
            Arcana
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/sign-in")}
              className="px-5 py-2 text-sm uppercase tracking-[2px] text-secondary font-medium hover:text-primary transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="btn-metallic px-5 py-2 text-sm uppercase tracking-[2px] font-bold"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24 px-6 lg:px-16 max-w-screen-xl mx-auto">

        {/* ── Hero ── */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[10px] uppercase tracking-[4px] text-primary font-bold mb-4">
            Simple Pricing
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-on-surface mb-5 font-headline">
            Invest in your{" "}
            <span className="text-primary">financial clarity</span>
          </h1>
          <p className="text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Start free. Upgrade when you need AI insights, unlimited connections, and team collaboration.
            No surprises — cancel whenever.
          </p>
        </motion.div>

        {/* ── Annual / Monthly toggle ── */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <span className={`text-xs uppercase tracking-[2px] font-bold transition-colors ${!annual ? "text-on-surface" : "text-secondary"}`}>
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setAnnual((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-outline/40"}`}
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
          <span className={`text-xs uppercase tracking-[2px] font-bold transition-colors ${annual ? "text-on-surface" : "text-secondary"}`}>
            Annual
          </span>
          {annual && (
            <span className="px-2 py-0.5 rounded-full bg-arcana-success/20 text-arcana-success text-[10px] font-black uppercase tracking-[2px]">
              Save 20%
            </span>
          )}
        </motion.div>

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => {
            const display = getDisplayPrice(plan.price, annual);
            return (
              <motion.div
                key={plan.id}
                className={`relative rounded-sm border p-8 flex flex-col gap-6 bg-gradient-to-b ${PLAN_GRADIENTS[plan.id as PlanId]} ${
                  plan.highlighted
                    ? "border-primary/50 shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.15)]"
                    : "border-outline/40"
                }`}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[3px] bg-primary text-on-primary shadow-lg">
                    Most Popular
                  </span>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <span className={plan.highlighted ? "text-primary" : "text-secondary"}>
                    {PLAN_ICONS[plan.id as PlanId]}
                  </span>
                  <span className="text-sm font-black uppercase tracking-[2px] text-on-surface">
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-5xl font-extralight text-on-surface tracking-tight">
                      {display.amount === 0 ? "Free" : display.label}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-secondary">/ mo</span>
                    )}
                  </div>
                  {display.savings && (
                    <p className="text-[10px] text-arcana-success font-bold uppercase tracking-wider mb-1">
                      {display.savings}
                    </p>
                  )}
                  <p className="text-xs text-secondary leading-relaxed">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-on-surface/80">
                      <Check className="w-3.5 h-3.5 text-arcana-success flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => router.push(
                    plan.id === "starter"
                      ? "/sign-up"
                      : `/sign-up?plan=${plan.id}${annual ? "&billing=annual" : ""}`
                  )}
                  className={`w-full py-3 rounded-sm text-[11px] font-black uppercase tracking-[2px] flex items-center justify-center gap-2 transition-all ${
                    plan.highlighted
                      ? "btn-metallic hover:opacity-90"
                      : "border border-outline/60 text-secondary hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {plan.id === "starter" ? "Start Free" : "Get Started"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Trust bar ── */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-center gap-10 mb-24 py-10 border-y border-outline/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-on-surface uppercase tracking-wider">{label}</p>
                <p className="text-[11px] text-secondary">{sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Feature comparison table ── */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-2xl font-black tracking-tighter text-on-surface mb-8 text-center font-headline">
            Compare plans
          </h2>
          <div className="overflow-x-auto rounded-sm border border-outline/30">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline/20 bg-surface-container-high">
                  <th className="text-left px-6 py-4 text-secondary uppercase tracking-[2px] font-bold w-1/2">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className="text-center px-4 py-4 uppercase tracking-[2px] font-bold text-on-surface">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Bank connections", starter: "1", pro: "Unlimited", team: "Unlimited" },
                  { label: "Transaction history", starter: "90 days", pro: "Full history", team: "Full history" },
                  { label: "AI financial insights", starter: "—", pro: "✓", team: "✓" },
                  { label: "Portfolio analytics", starter: "—", pro: "✓", team: "✓" },
                  { label: "Tax-loss harvesting", starter: "—", pro: "✓", team: "✓" },
                  { label: "Budget tracking & goals", starter: "—", pro: "✓", team: "✓" },
                  { label: "Monte Carlo projections", starter: "—", pro: "✓", team: "✓" },
                  { label: "CSV & PDF exports", starter: "—", pro: "✓", team: "✓" },
                  { label: "Advisor Academy access", starter: "Preview", pro: "Full access", team: "Full access" },
                  { label: "Workspace members", starter: "1", pro: "1", team: "Up to 10" },
                  { label: "Audit log", starter: "—", pro: "30 days", team: "1 year" },
                  { label: "Support", starter: "Community", pro: "Priority email", team: "Dedicated" },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-outline/10 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                    <td className="px-6 py-3.5 text-on-surface/80 font-medium">{row.label}</td>
                    <td className="px-4 py-3.5 text-center text-secondary">{row.starter}</td>
                    <td className="px-4 py-3.5 text-center text-arcana-success font-medium">{row.pro}</td>
                    <td className="px-4 py-3.5 text-center text-arcana-success font-medium">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <motion.div
          className="max-w-2xl mx-auto mb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-black tracking-tighter text-on-surface mb-8 text-center font-headline">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-outline/30 rounded-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-white/3 transition-colors"
                >
                  {item.q}
                  <span className="text-secondary ml-4 flex-shrink-0">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-xs text-secondary leading-relaxed border-t border-outline/20 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA strip ── */}
        <motion.div
          className="text-center glass-panel rounded-sm border border-outline/30 py-16 px-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="text-3xl font-black tracking-tighter text-on-surface mb-3 font-headline">
            Ready to take control?
          </h2>
          <p className="text-secondary text-sm mb-8 max-w-md mx-auto">
            Join thousands of users who manage their finances, portfolios, and career growth in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="btn-metallic px-8 py-3 text-sm uppercase tracking-[2px] font-black flex items-center gap-2 justify-center"
            >
              Start Free Today <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/sign-up?plan=pro")}
              className="px-8 py-3 text-sm uppercase tracking-[2px] font-bold border border-outline/60 text-secondary hover:border-primary/40 hover:text-primary transition-colors rounded-sm"
            >
              Start Pro Trial
            </button>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-outline/20 py-8 px-8 lg:px-16">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[2px] text-secondary">
          <span className="font-black text-primary text-sm font-headline">Arcana</span>
          <div className="flex gap-6">
            <button type="button" onClick={() => router.push("/privacy")} className="hover:text-primary transition-colors">Privacy</button>
            <button type="button" onClick={() => router.push("/terms")} className="hover:text-primary transition-colors">Terms</button>
            <button type="button" onClick={() => router.push("/")} className="hover:text-primary transition-colors">Home</button>
          </div>
          <span>© {new Date().getFullYear()} Arcana. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
