import Stripe from "stripe";

// ─── Stripe client (singleton) ───────────────────────────────────────────────
// In dev without STRIPE_SECRET_KEY the client is null; all callers check isSandbox().

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable billing."
    );
  }
  _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _stripe;
}

/** True when Stripe env vars are absent — activates sandbox mock paths. */
export function isSandboxBilling(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

// ─── Plan definitions ────────────────────────────────────────────────────────

export type PlanId = "starter" | "pro" | "team";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number; // usd cents / month (0 = free)
  priceLabel: string;
  description: string;
  features: string[];
  stripePriceEnvKey: string | null;
  highlighted?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    priceLabel: "Free",
    description: "Core finance tracking for individuals.",
    features: [
      "1 connected bank account",
      "90-day transaction history",
      "10,000 AI tokens / month",
      "Income & expense views",
      "Manual transaction CRUD",
      "Basic dashboard",
    ],
    stripePriceEnvKey: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: 1200,
    priceLabel: "$12 / mo",
    description: "Everything in Starter, plus AI, exports, and unlimited banks.",
    features: [
      "Unlimited bank accounts",
      "Full transaction history",
      "250,000 AI tokens / month",
      "CSV & PDF exports",
      "Budget tracking & goals",
      "Audit log (30 days)",
      "Priority support",
    ],
    stripePriceEnvKey: "STRIPE_PRO_PRICE_ID",
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    price: 2900,
    priceLabel: "$29 / mo",
    description: "Pro features for households and teams.",
    features: [
      "Everything in Pro",
      "1,000,000 AI tokens / month",
      "Up to 10 workspace members",
      "Role-based access control",
      "Shared dashboards",
      "Audit log (1 year)",
      "Dedicated support",
    ],
    stripePriceEnvKey: "STRIPE_TEAM_PRICE_ID",
  },
];

export function getPlanById(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function getPriceId(plan: PlanId): string | null {
  const def = getPlanById(plan);
  if (!def.stripePriceEnvKey) return null;
  return process.env[def.stripePriceEnvKey] ?? null;
}
