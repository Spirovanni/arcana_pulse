import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
  isAppwriteConfigured,
} from "@/lib/appwrite";
import type { WorkspacePlan } from "@/lib/types";
import type { Models } from "node-appwrite";

export interface AIUsageRecord {
  usageId: string;
  workspaceId: string;
  periodKey: string;
  plan: WorkspacePlan;
  requestsUsed: number;
  tokensUsed: number;
  featureUsage: Record<string, { requests: number; tokens: number }>;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseFeatureUsage(raw: unknown): Record<
  string,
  { requests: number; tokens: number }
> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      { requests: number; tokens: number }
    >;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function toAIUsageRecord(
  doc: Models.Document & Record<string, unknown>
): AIUsageRecord {
  return {
    usageId: doc.$id,
    workspaceId: String(doc.workspaceId ?? ""),
    periodKey: String(doc.periodKey ?? ""),
    plan: (doc.plan as WorkspacePlan) ?? "starter",
    requestsUsed: Number(doc.requestsUsed ?? 0),
    tokensUsed: Number(doc.tokensUsed ?? 0),
    featureUsage: parseFeatureUsage(doc.featureUsageJson),
    lastUsedAt: typeof doc.lastUsedAt === "string" ? doc.lastUsedAt : null,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

function usageDocumentId(workspaceId: string, periodKey: string): string {
  const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePeriod = periodKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `aiu-${safeWorkspace}-${safePeriod}`.slice(0, 36);
}

export async function getAIUsageByWorkspacePeriod(
  workspaceId: string,
  periodKey: string
): Promise<AIUsageRecord | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();
  try {
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.aiUsage,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("periodKey", periodKey),
        Query.limit(1),
      ]
    );
    if (result.total === 0 || result.documents.length === 0) return null;
    return toAIUsageRecord(result.documents[0] as Models.Document & Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function upsertAIUsageByWorkspacePeriod(input: {
  workspaceId: string;
  periodKey: string;
  plan: WorkspacePlan;
  requestsUsed: number;
  tokensUsed: number;
  featureUsage: Record<string, { requests: number; tokens: number }>;
  lastUsedAt: string | null;
}): Promise<AIUsageRecord | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();
  const docId = usageDocumentId(input.workspaceId, input.periodKey);
  const payload = {
    workspaceId: input.workspaceId,
    periodKey: input.periodKey,
    plan: input.plan,
    requestsUsed: input.requestsUsed,
    tokensUsed: input.tokensUsed,
    featureUsageJson: JSON.stringify(input.featureUsage),
    lastUsedAt: input.lastUsedAt,
  };

  try {
    const updated = await db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.aiUsage,
      docId,
      payload
    );
    return toAIUsageRecord(updated as Models.Document & Record<string, unknown>);
  } catch {
    try {
      const created = await db.createDocument(
        DATABASE_ID,
        COLLECTIONS.aiUsage,
        docId,
        payload
      );
      return toAIUsageRecord(created as Models.Document & Record<string, unknown>);
    } catch {
      return null;
    }
  }
}
