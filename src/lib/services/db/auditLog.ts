import { ID, Query } from "node-appwrite";
import { getDatabase, DATABASE_ID, COLLECTIONS, isAppwriteConfigured } from "@/lib/appwrite";

export type AuditAction =
  | "sign_in"
  | "sign_out"
  | "sign_up"
  | "mfa_enable"
  | "mfa_disable"
  | "mfa_verify"
  | "password_reset"
  | "email_verify"
  | "transaction_create"
  | "transaction_update"
  | "transaction_delete"
  | "transfer_create"
  | "bank_link"
  | "bank_remove"
  | "settings_change"
  | "export_data"
  | "strategy_create"
  | "strategy_update"
  | "backtest_run"
  | "paper_order_submit"
  | "paper_order_cancel"
  | "alert_rule_created"
  | "alert_rule_deleted"
  | "alert_sent"
  | "risk_limit_breach";


export interface AuditEvent {
  workspaceId: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  targetEntity: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry extends AuditEvent {
  id: string;
  createdAt: string;
}

/**
 * Writes an audit event. Fire-and-forget safe — errors are swallowed so
 * a logging failure never breaks the operation being audited.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  if (!isAppwriteConfigured()) return;

  try {
    const db = getDatabase();
    await db.createDocument(DATABASE_ID, COLLECTIONS.auditLogs, ID.unique(), {
      workspaceId: event.workspaceId,
      userId: event.userId,
      userEmail: event.userEmail,
      action: event.action,
      targetEntity: event.targetEntity,
      targetId: event.targetId ?? "",
      ipAddress: event.ipAddress ?? "",
      userAgent: event.userAgent ?? "",
      metadata: event.metadata ? JSON.stringify(event.metadata) : "{}",
    });
  } catch {
    // Never let audit logging break the calling operation
  }
}

export interface AuditLogFilter {
  workspaceId: string;
  userId?: string;
  action?: AuditAction;
  limit?: number;
}

export async function listAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
  if (!isAppwriteConfigured()) return [];

  const db = getDatabase();
  const queries: string[] = [
    Query.equal("workspaceId", filter.workspaceId),
    Query.orderDesc("$createdAt"),
    Query.limit(filter.limit ?? 50),
  ];

  if (filter.userId) queries.push(Query.equal("userId", filter.userId));
  if (filter.action) queries.push(Query.equal("action", filter.action));

  const res = await db.listDocuments(DATABASE_ID, COLLECTIONS.auditLogs, queries);

  return res.documents.map((doc) => ({
    id: doc.$id,
    createdAt: doc.$createdAt,
    workspaceId: doc.workspaceId as string,
    userId: doc.userId as string,
    userEmail: doc.userEmail as string,
    action: doc.action as AuditAction,
    targetEntity: doc.targetEntity as string,
    targetId: doc.targetId as string,
    ipAddress: doc.ipAddress as string,
    userAgent: doc.userAgent as string,
    metadata: (() => {
      try { return JSON.parse(doc.metadata as string); } catch { return {}; }
    })(),
  }));
}
