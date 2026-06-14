/**
 * Plan limits and enforcement helpers.
 *
 * All server-side enforcement lives here so API routes, service functions,
 * and middleware can share a single source of truth for what each plan
 * permits. UI gating is handled separately by PlanGate / usePlanGate.
 */

import type { WorkspacePlan } from "@/lib/types";

// ---------------------------------------------------------------------------
// Limit definitions
// ---------------------------------------------------------------------------

export interface PlanLimits {
  /** Maximum linked bank accounts (Plaid). null = unlimited */
  maxBankAccounts: number | null;
  /** Maximum workspace members. null = unlimited */
  maxMembers: number | null;
  /** Maximum transaction history lookback in days. null = unlimited */
  transactionHistoryDays: number | null;
  /** Whether AI features (forecasting, insights, categorization) are enabled */
  aiEnabled: boolean;
  /** Whether CSV/PDF export is enabled */
  exportEnabled: boolean;
  /** Whether audit log access is enabled (and for how many days) */
  auditLogDays: number | null;
}

const LIMITS: Record<WorkspacePlan, PlanLimits> = {
  starter: {
    maxBankAccounts: 1,
    maxMembers: 1,
    transactionHistoryDays: 90,
    aiEnabled: false,
    exportEnabled: false,
    auditLogDays: null,
  },
  pro: {
    maxBankAccounts: null,
    maxMembers: 1,
    transactionHistoryDays: null,
    aiEnabled: true,
    exportEnabled: true,
    auditLogDays: 30,
  },
  team: {
    maxBankAccounts: null,
    maxMembers: 10,
    transactionHistoryDays: null,
    aiEnabled: true,
    exportEnabled: true,
    auditLogDays: 365,
  },
};

export function getPlanLimits(plan: WorkspacePlan): PlanLimits {
  return LIMITS[plan] ?? LIMITS.starter;
}

// ---------------------------------------------------------------------------
// Enforcement helpers — return an error string if the action is blocked,
// or null if it's allowed.
// ---------------------------------------------------------------------------

export function canAddBankAccount(
  plan: WorkspacePlan,
  currentBankCount: number
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan);
  if (limits.maxBankAccounts === null) return { allowed: true };
  if (currentBankCount < limits.maxBankAccounts) return { allowed: true };

  return {
    allowed: false,
    reason: `Your ${plan} plan allows up to ${limits.maxBankAccounts} linked bank account${limits.maxBankAccounts !== 1 ? "s" : ""}. Upgrade to Pro for unlimited accounts.`,
  };
}

export function canAddWorkspaceMember(
  plan: WorkspacePlan,
  currentMemberCount: number
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan);
  if (limits.maxMembers === null) return { allowed: true };
  if (currentMemberCount < limits.maxMembers) return { allowed: true };

  return {
    allowed: false,
    reason: `Your ${plan} plan allows up to ${limits.maxMembers} workspace member${limits.maxMembers !== 1 ? "s" : ""}. Upgrade to Team for up to 10 members.`,
  };
}

export function canUseAI(
  plan: WorkspacePlan
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan);
  if (limits.aiEnabled) return { allowed: true };
  return {
    allowed: false,
    reason: "AI features require a Pro or Team plan. Upgrade to unlock forecasting, smart categorization, and portfolio insights.",
  };
}

export function canExport(
  plan: WorkspacePlan
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan);
  if (limits.exportEnabled) return { allowed: true };
  return {
    allowed: false,
    reason: "CSV and PDF exports require a Pro or Team plan.",
  };
}

/** Returns the transaction date cutoff for a plan (earliest date allowed). */
export function transactionHistoryCutoff(plan: WorkspacePlan): Date | null {
  const limits = getPlanLimits(plan);
  if (!limits.transactionHistoryDays) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.transactionHistoryDays);
  return cutoff;
}
