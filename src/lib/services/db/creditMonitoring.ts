import { ID, type Models } from "node-appwrite";
import { COLLECTIONS, DATABASE_ID, Query, getDatabase } from "@/lib/appwrite";
import type {
  CreditReminder,
  CreditReport,
  CreditStrategyRevision,
  CreditTimelineEntry,
} from "@/lib/types";

type CreditMonitoringDoc = Models.Document & Record<string, unknown>;

function parseJsonArray<T>(raw: unknown): T[] {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toCreditReport(doc: CreditMonitoringDoc): CreditReport {
  return {
    reportId: doc.$id,
    workspaceId: String(doc.workspaceId ?? ""),
    userId: String(doc.userId ?? ""),
    title: String(doc.title ?? "Credit Report"),
    reportText: String(doc.reportText ?? ""),
    currentScore:
      typeof doc.currentScore === "number" ? doc.currentScore : undefined,
    targetScore:
      typeof doc.targetScore === "number" ? doc.targetScore : undefined,
    strategyRevisions: parseJsonArray<CreditStrategyRevision>(
      doc.strategyRevisionsJson
    ),
    timeline: parseJsonArray<CreditTimelineEntry>(doc.timelineJson),
    reminders: parseJsonArray<CreditReminder>(doc.remindersJson),
    lastAnalyzedAt:
      typeof doc.lastAnalyzedAt === "string" ? doc.lastAnalyzedAt : undefined,
    status: doc.status === "archived" ? "archived" : "active",
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

export async function listCreditReports(
  workspaceId: string,
  userId: string
): Promise<CreditReport[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.creditMonitoring,
    [
      Query.equal("workspaceId", workspaceId),
      Query.equal("userId", userId),
      Query.limit(100),
      Query.orderDesc("$updatedAt"),
    ]
  );
  return result.documents.map((doc) => toCreditReport(doc as CreditMonitoringDoc));
}

export async function getCreditReport(
  reportId: string
): Promise<CreditReport | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.creditMonitoring,
      reportId
    );
    return toCreditReport(doc as CreditMonitoringDoc);
  } catch {
    return null;
  }
}

export async function createCreditReport(input: {
  workspaceId: string;
  userId: string;
  title: string;
  reportText: string;
  currentScore?: number;
  targetScore?: number;
}): Promise<CreditReport> {
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.creditMonitoring,
    ID.unique(),
    {
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: input.title,
      reportText: input.reportText,
      currentScore: input.currentScore,
      targetScore: input.targetScore,
      strategyRevisionsJson: JSON.stringify([]),
      timelineJson: JSON.stringify([]),
      remindersJson: JSON.stringify([]),
      status: "active",
    }
  );
  return toCreditReport(doc as CreditMonitoringDoc);
}

export async function updateCreditReport(
  reportId: string,
  updates: Partial<{
    title: string;
    reportText: string;
    currentScore: number;
    targetScore: number;
    lastAnalyzedAt: string;
    status: "active" | "archived";
    strategyRevisions: CreditStrategyRevision[];
    timeline: CreditTimelineEntry[];
    reminders: CreditReminder[];
  }>
): Promise<CreditReport> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.reportText !== undefined) payload.reportText = updates.reportText;
  if (updates.currentScore !== undefined) payload.currentScore = updates.currentScore;
  if (updates.targetScore !== undefined) payload.targetScore = updates.targetScore;
  if (updates.lastAnalyzedAt !== undefined) payload.lastAnalyzedAt = updates.lastAnalyzedAt;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.strategyRevisions !== undefined) {
    payload.strategyRevisionsJson = JSON.stringify(updates.strategyRevisions);
  }
  if (updates.timeline !== undefined) {
    payload.timelineJson = JSON.stringify(updates.timeline);
  }
  if (updates.reminders !== undefined) {
    payload.remindersJson = JSON.stringify(updates.reminders);
  }

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.creditMonitoring,
    reportId,
    payload
  );
  return toCreditReport(doc as CreditMonitoringDoc);
}
