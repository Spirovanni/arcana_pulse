import { ID, type Models } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, Query, getDatabase } from "@/lib/appwrite";

type AIReportDoc = Models.Document & Record<string, unknown>;

export interface PersistedAnalysis<T> {
  value: T;
  analyzedAt: string;
}

const MAX_JSON_CHARS = 59000;

function parseValue<T>(raw: unknown): T | null {
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toPersisted<T>(doc: AIReportDoc): PersistedAnalysis<T> | null {
  const value = parseValue<T>(doc.payloadJson);
  if (!value) return null;
  const analyzedAt =
    typeof doc.lastRunAt === "string" && doc.lastRunAt.length > 0
      ? doc.lastRunAt
      : doc.$updatedAt;
  return { value, analyzedAt };
}

function serializeValue(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_JSON_CHARS) {
    throw new Error(
      `AI report payload exceeds storage limit (${serialized.length} chars).`
    );
  }
  return serialized;
}

export async function getPersistedAnalysis<T>(
  workspaceId: string,
  userId: string,
  reportKey: string
): Promise<PersistedAnalysis<T> | null> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.aiReports,
    [
      Query.equal("workspaceId", workspaceId),
      Query.equal("userId", userId),
      Query.equal("reportKey", reportKey),
      Query.limit(1),
      Query.orderDesc("$updatedAt"),
    ]
  );
  const doc = result.documents[0] as AIReportDoc | undefined;
  if (!doc) return null;
  return toPersisted<T>(doc);
}

export async function upsertPersistedAnalysis<T>(
  workspaceId: string,
  userId: string,
  reportKey: string,
  value: T
): Promise<PersistedAnalysis<T>> {
  const now = new Date().toISOString();
  const payloadJson = serializeValue(value);
  const db = getDatabase();

  const existing = await db.listDocuments(DATABASE_ID, COLLECTIONS.aiReports, [
    Query.equal("workspaceId", workspaceId),
    Query.equal("userId", userId),
    Query.equal("reportKey", reportKey),
    Query.limit(1),
  ]);
  const existingDoc = existing.documents[0] as AIReportDoc | undefined;

  if (existingDoc) {
    await db.updateDocument(DATABASE_ID, COLLECTIONS.aiReports, existingDoc.$id, {
      payloadJson,
      lastRunAt: now,
    });
  } else {
    await db.createDocument(DATABASE_ID, COLLECTIONS.aiReports, ID.unique(), {
      workspaceId,
      userId,
      reportKey,
      payloadJson,
      lastRunAt: now,
    });
  }

  return { value, analyzedAt: now };
}
