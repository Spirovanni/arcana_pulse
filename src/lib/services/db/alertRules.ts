import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type { AlertRule, CreateAlertRuleInput, AlertRuleKind } from "@/lib/types";
import type { Models } from "node-appwrite";

function toAlertRule(doc: Models.Document & Record<string, any>): AlertRule {
  return {
    id: doc.$id,
    workspaceId: doc.workspaceId,
    createdBy: doc.createdBy,
    name: doc.name,
    kind: doc.kind as AlertRuleKind,
    config: doc.config,
    channels: doc.channels || [],
    active: doc.active,
    lastTriggeredAt: doc.lastTriggeredAt ?? undefined,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

export async function createAlertRule(
  input: CreateAlertRuleInput
): Promise<AlertRule> {
  const data: Record<string, any> = {
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    name: input.name,
    kind: input.kind,
    config: input.config,
    channels: input.channels,
    active: input.active ?? true,
  };

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.alertRules,
    generateId("alr"),
    data
  );
  return toAlertRule(doc);
}

export async function updateAlertRule(
  id: string,
  updates: Partial<Omit<AlertRule, "id" | "workspaceId" | "createdAt" | "updatedAt">>
): Promise<AlertRule> {
  const data: Record<string, any> = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.kind !== undefined) data.kind = updates.kind;
  if (updates.config !== undefined) data.config = updates.config;
  if (updates.channels !== undefined) data.channels = updates.channels;
  if (updates.active !== undefined) data.active = updates.active;
  if (updates.lastTriggeredAt !== undefined) data.lastTriggeredAt = updates.lastTriggeredAt;

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.alertRules,
    id,
    data
  );
  return toAlertRule(doc);
}

export async function deleteAlertRule(id: string): Promise<void> {
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.alertRules,
    id
  );
}

export async function getAlertRule(id: string): Promise<AlertRule | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.alertRules,
      id
    );
    return toAlertRule(doc);
  } catch {
    return null;
  }
}

export async function listAlertRules(
  workspaceId: string,
  limit: number = 100
): Promise<AlertRule[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.alertRules,
    [
      Query.equal("workspaceId", workspaceId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]
  );
  return result.documents.map(toAlertRule);
}
