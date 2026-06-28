"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Zap, Users, Star, ExternalLink, Loader2 } from "lucide-react";
import { PLANS, isSandboxBilling } from "@/lib/stripe";
import type { WorkspacePlan } from "@/lib/types";
import type { PlanId } from "@/lib/stripe";

interface BillingSettingsProps {
  currentPlan: WorkspacePlan;
}

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  starter: <Star className="w-4 h-4" />,
  pro: <Zap className="w-4 h-4" />,
  team: <Users className="w-4 h-4" />,
};

export default function BillingSettings({ currentPlan }: BillingSettingsProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "info" | "warn"; msg: string } | null>(null);
  const [usage, setUsage] = useState<{
    tokenLimit: number | null;
    tokensUsed: number;
    tokensRemaining: number | null;
    periodKey: string;
    requestsUsed: number;
  } | null>(null);

  // Handle return from Stripe checkout / portal
  useEffect(() => {
    const billing = searchParams.get("billing");
    if (!billing) return;
    if (billing === "success") {
      const plan = searchParams.get("plan") ?? "pro";
      setToast({ type: "success", msg: `🎉 You're now on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!` });
    } else if (billing === "cancelled") {
      setToast({ type: "info", msg: "Upgrade cancelled — your current plan is unchanged." });
    } else if (billing === "sandbox_upgrade") {
      const plan = searchParams.get("plan") ?? "pro";
      setToast({ type: "info", msg: `Sandbox mode: Stripe is not configured. Upgrade to ${plan} would be processed here.` });
    } else if (billing === "sandbox_portal") {
      setToast({ type: "info", msg: "Sandbox mode: Billing portal requires STRIPE_SECRET_KEY." });
    }
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loadUsage = async () => {
      try {
        const res = await fetch("/api/ai/usage");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.usage) {
          setUsage({
            tokenLimit: data.usage.tokenLimit,
            tokensUsed: data.usage.tokensUsed,
            tokensRemaining: data.usage.tokensRemaining,
            periodKey: data.usage.periodKey,
            requestsUsed: data.usage.requestsUsed,
          });
        }
      } catch {
        // non-critical
      }
    };
    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpgrade(planId: PlanId) {
    if (planId === currentPlan) return;
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout");
      window.location.href = data.url;
    } catch (err) {
      setToast({ type: "warn", msg: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open portal");
      window.location.href = data.url;
    } catch (err) {
      setToast({ type: "warn", msg: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setPortalLoading(false);
    }
  }

  const isSandbox = isSandboxBilling();

  return (
    <div className="rounded-sm bg-surface-container-high border border-outline p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">
            Subscription &amp; Billing
          </h3>
          <p className="text-xs text-secondary">
            Upgrade your plan to unlock AI insights, unlimited bank connections, and team collaboration.
          </p>
        </div>
        {currentPlan !== "starter" && (
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-sm border border-outline text-secondary text-[10px] uppercase tracking-[1px] font-bold hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
          >
            {portalLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            Manage Billing
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-sm px-4 py-3 text-xs font-medium border ${
            toast.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-arcana-success"
              : toast.type === "warn"
              ? "bg-red-500/10 border-red-500/20 text-arcana-danger"
              : "bg-amber-500/5 border-amber-500/20 text-arcana-warning"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Sandbox notice */}
      {isSandbox && (
        <div className="rounded-sm bg-amber-500/5 border border-amber-500/20 px-4 py-3">
          <p className="text-[10px] text-arcana-warning font-bold uppercase tracking-wider mb-0.5">
            Sandbox Billing
          </p>
          <p className="text-[10px] text-secondary">
            STRIPE_SECRET_KEY is not set. Checkout flows will be simulated. Add your Stripe keys to .env.local to enable real billing.
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.id;
          const isUpgrade = plan.price > (PLANS.find((p) => p.id === currentPlan)?.price ?? 0);
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-sm border p-5 flex flex-col gap-4 transition-all ${
                plan.highlighted && !isActive
                  ? "border-primary/40 bg-primary/5"
                  : isActive
                  ? "border-arcana-success/40 bg-green-500/5"
                  : "border-outline bg-surface-container"
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && !isActive && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-primary text-on-primary">
                  Most Popular
                </span>
              )}
              {/* Current plan badge */}
              {isActive && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-arcana-success/20 text-arcana-success border border-arcana-success/30">
                  Current Plan
                </span>
              )}

              {/* Plan name + price */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${isActive ? "text-arcana-success" : "text-primary"}`}>
                    {PLAN_ICONS[plan.id]}
                  </span>
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-light text-on-surface tracking-tight">
                    {plan.price === 0 ? "Free" : `$${plan.price / 100}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-xs text-secondary">/ mo</span>
                  )}
                </div>
                <p className="text-[10px] text-secondary mt-1">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-on-surface/80">
                    <Check className="w-3 h-3 text-arcana-success flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleUpgrade(plan.id as PlanId)}
                disabled={isActive || isLoading || (!isUpgrade && !isActive)}
                className={`w-full py-2.5 rounded-sm text-[11px] font-bold uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-green-500/10 text-arcana-success border border-arcana-success/20 cursor-default"
                    : isUpgrade
                    ? "btn-metallic hover:opacity-90"
                    : "bg-surface-container border border-outline text-secondary cursor-not-allowed opacity-50"
                }`}
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isActive
                  ? "Active"
                  : isUpgrade
                  ? isLoading
                    ? "Redirecting..."
                    : "Upgrade"
                  : "Downgrade"}
              </button>
            </div>
          );
        })}
      </div>

      {usage && (
        <div className="rounded-sm border border-outline bg-surface-container p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] uppercase tracking-[2px] text-secondary font-bold">
              AI Token Usage
            </h4>
            <span className="text-[10px] text-secondary">
              Period: {usage.periodKey}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-on-surface">
              {usage.tokensUsed.toLocaleString()} tokens used
            </span>
            <span className="text-xs text-secondary">
              {usage.tokenLimit == null
                ? "Unlimited"
                : `${(usage.tokensRemaining ?? 0).toLocaleString()} remaining`}
            </span>
          </div>
          {usage.tokenLimit != null && (
            <div className="h-2 rounded-full bg-outline/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (usage.tokensUsed / Math.max(1, usage.tokenLimit)) * 100
                  )}%`,
                }}
              />
            </div>
          )}
          <p className="text-[10px] text-secondary">
            AI requests this period: {usage.requestsUsed.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
