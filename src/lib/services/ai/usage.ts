import { canUseAI, getPlanLimits } from "@/lib/planLimits";
import type { WorkspacePlan } from "@/lib/types";
import { resolveWorkspacePlan } from "@/lib/services/workspacePlan";
import {
  getAIUsageByWorkspacePeriod,
  upsertAIUsageByWorkspacePeriod,
} from "@/lib/services/db/aiUsage";

type FeatureUsage = {
  requests: number;
  tokens: number;
};

type UsageRecord = {
  workspaceId: string;
  plan: WorkspacePlan;
  periodKey: string;
  requestsUsed: number;
  tokensUsed: number;
  featureUsage: Record<string, FeatureUsage>;
  lastUsedAt: string | null;
};

export interface AIUsageSnapshot {
  workspaceId: string;
  plan: WorkspacePlan;
  periodKey: string;
  tokenLimit: number | null;
  tokensUsed: number;
  tokensRemaining: number | null;
  requestsUsed: number;
  featureUsage: Record<string, FeatureUsage>;
  lastUsedAt: string | null;
}

const CHARS_PER_TOKEN = 4;
const usageStore = new Map<string, UsageRecord>();
const DEFAULT_FEATURE = "assistant";

const FEATURE_COST_MULTIPLIER: Record<string, number> = {
  assistant: 1.0,
  categorize: 0.35,
  insights: 1.25,
  budgets: 1.15,
  forecast: 1.4,
  goals: 1.1,
  portfolio_insights: 1.5,
  tlh: 1.35,
  credit_monitoring: 1.3,
  agent_builder: 1.15,
};

const FEATURE_BASE_FEE: Record<string, number> = {
  assistant: 18,
  categorize: 6,
  insights: 24,
  budgets: 22,
  forecast: 28,
  goals: 20,
  portfolio_insights: 26,
  tlh: 24,
  credit_monitoring: 24,
  agent_builder: 26,
};

const PLAN_EFFICIENCY_MULTIPLIER: Record<WorkspacePlan, number> = {
  starter: 1.15,
  pro: 1.0,
  team: 0.85,
};

function getPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildStoreKey(workspaceId: string, periodKey: string): string {
  return `${workspaceId}:${periodKey}`;
}

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function getFeatureMultiplier(feature: string): number {
  return FEATURE_COST_MULTIPLIER[feature] ?? 1.1;
}

function getFeatureBaseFee(feature: string): number {
  return FEATURE_BASE_FEE[feature] ?? 15;
}

function calculateBilledTokens(params: {
  plan: WorkspacePlan;
  feature: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const featureMultiplier = getFeatureMultiplier(params.feature);
  const planMultiplier = PLAN_EFFICIENCY_MULTIPLIER[params.plan] ?? 1.0;
  const baseFee = getFeatureBaseFee(params.feature);
  const raw = Math.max(1, params.inputTokens) + Math.max(0, params.outputTokens);
  const weighted = Math.ceil(raw * featureMultiplier * planMultiplier);
  return Math.max(baseFee, weighted);
}

function toSnapshot(record: UsageRecord): AIUsageSnapshot {
  const tokenLimit = getPlanLimits(record.plan).aiMonthlyTokens;
  const tokensRemaining =
    tokenLimit == null ? null : Math.max(0, tokenLimit - record.tokensUsed);

  return {
    workspaceId: record.workspaceId,
    plan: record.plan,
    periodKey: record.periodKey,
    tokenLimit,
    tokensUsed: record.tokensUsed,
    tokensRemaining,
    requestsUsed: record.requestsUsed,
    featureUsage: record.featureUsage,
    lastUsedAt: record.lastUsedAt,
  };
}

function getOrInitRecord(workspaceId: string, plan: WorkspacePlan): UsageRecord {
  const periodKey = getPeriodKey();
  const key = buildStoreKey(workspaceId, periodKey);
  const existing = usageStore.get(key);
  if (existing) {
    if (existing.plan !== plan) {
      existing.plan = plan;
    }
    return existing;
  }

  const created: UsageRecord = {
    workspaceId,
    plan,
    periodKey,
    requestsUsed: 0,
    tokensUsed: 0,
    featureUsage: {},
    lastUsedAt: null,
  };
  usageStore.set(key, created);
  return created;
}

async function getOrInitRecordWithPersistence(
  workspaceId: string,
  plan: WorkspacePlan
): Promise<UsageRecord> {
  const periodKey = getPeriodKey();
  const key = buildStoreKey(workspaceId, periodKey);
  const cached = usageStore.get(key);
  if (cached) {
    if (cached.plan !== plan) cached.plan = plan;
    return cached;
  }

  const persisted = await getAIUsageByWorkspacePeriod(workspaceId, periodKey);
  if (persisted) {
    const hydrated: UsageRecord = {
      workspaceId: persisted.workspaceId,
      plan,
      periodKey: persisted.periodKey,
      requestsUsed: persisted.requestsUsed,
      tokensUsed: persisted.tokensUsed,
      featureUsage: persisted.featureUsage,
      lastUsedAt: persisted.lastUsedAt,
    };
    usageStore.set(key, hydrated);
    return hydrated;
  }

  return getOrInitRecord(workspaceId, plan);
}

export async function getAIUsageSnapshot(
  workspaceId: string
): Promise<AIUsageSnapshot> {
  const plan = await resolveWorkspacePlan(workspaceId);
  const record = await getOrInitRecordWithPersistence(workspaceId, plan);
  return toSnapshot(record);
}

export async function checkAIUsageAllowance(
  workspaceId: string,
  estimatedTokens = 1,
  feature = DEFAULT_FEATURE
): Promise<
  | { allowed: true; plan: WorkspacePlan; snapshot: AIUsageSnapshot }
  | { allowed: false; reason: string; plan: WorkspacePlan; snapshot: AIUsageSnapshot }
> {
  const plan = await resolveWorkspacePlan(workspaceId);
  const aiAccess = canUseAI(plan);
  const record = await getOrInitRecordWithPersistence(workspaceId, plan);
  const snapshot = toSnapshot(record);

  if (!aiAccess.allowed) {
    return { allowed: false, reason: aiAccess.reason, plan, snapshot };
  }

  const tokenLimit = snapshot.tokenLimit;
  if (tokenLimit == null) {
    return { allowed: true, plan, snapshot };
  }

  const estimatedCharge = calculateBilledTokens({
    plan,
    feature,
    inputTokens: Math.max(1, estimatedTokens),
    outputTokens: 0,
  });
  if (snapshot.tokensUsed + estimatedCharge > tokenLimit) {
    return {
      allowed: false,
      reason: `Your ${plan} plan AI token limit (${tokenLimit.toLocaleString()} per month) has been reached.`,
      plan,
      snapshot,
    };
  }

  return { allowed: true, plan, snapshot };
}

export async function recordAIUsage(params: {
  workspaceId: string;
  plan: WorkspacePlan;
  feature: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<AIUsageSnapshot> {
  const record = await getOrInitRecordWithPersistence(
    params.workspaceId,
    params.plan
  );
  const totalTokens = calculateBilledTokens({
    plan: params.plan,
    feature: params.feature,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });

  record.requestsUsed += 1;
  record.tokensUsed += totalTokens;
  record.lastUsedAt = new Date().toISOString();

  if (!record.featureUsage[params.feature]) {
    record.featureUsage[params.feature] = { requests: 0, tokens: 0 };
  }
  record.featureUsage[params.feature].requests += 1;
  record.featureUsage[params.feature].tokens += totalTokens;

  await upsertAIUsageByWorkspacePeriod({
    workspaceId: record.workspaceId,
    periodKey: record.periodKey,
    plan: record.plan,
    requestsUsed: record.requestsUsed,
    tokensUsed: record.tokensUsed,
    featureUsage: record.featureUsage,
    lastUsedAt: record.lastUsedAt,
  });

  return toSnapshot(record);
}
