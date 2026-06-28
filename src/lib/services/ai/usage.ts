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
  estimatedTokens = 1
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

  if (snapshot.tokensUsed + Math.max(1, estimatedTokens) > tokenLimit) {
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
  const totalTokens = Math.max(0, params.inputTokens) + Math.max(0, params.outputTokens);

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
