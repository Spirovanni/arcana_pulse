import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Transaction } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, generateId } from "@/lib/utils";
import { mockTransactions } from "@/lib/mock/data";
import type { Models } from "node-appwrite";

export type NotificationType =
  | "large_transaction"
  | "budget_warning"
  | "ai_insight"
  | "transfer_status"
  | "anomaly"
  | "goal_progress"
  | "price_threshold"
  | "strategy_signal"
  | "paper_order_event"
  | "risk_limit_breach";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface Notification {
  id: string;
  workspaceId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
  alertRuleId?: string;
}

function toNotification(doc: Models.Document & Record<string, any>): Notification {
  return {
    id: doc.$id,
    workspaceId: doc.workspaceId,
    type: doc.type as NotificationType,
    severity: doc.severity as NotificationSeverity,
    title: doc.title,
    body: doc.body,
    read: doc.read,
    createdAt: doc.$createdAt,
    href: doc.href ?? undefined,
    alertRuleId: doc.alertRuleId ?? undefined,
  };
}

async function seedInitialNotifications(workspaceId: string): Promise<void> {
  const txns = mockTransactions.filter((t) => t.workspaceId === workspaceId);

  // Large transactions (top 3 by amount)
  const large = [...txns]
    .filter((t) => t.transactionType === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  for (const txn of large) {
    await addNotification({
      workspaceId,
      type: "large_transaction",
      severity: txn.amount > 1000 ? "warning" : "info",
      title: "Large transaction detected",
      body: `${txn.title} — ${formatCurrency(txn.amount)} in ${CATEGORY_LABELS[txn.category] ?? txn.category}`,
      href: "/transactions",
    });
  }

  // Budget warning — synthetic
  await addNotification({
    workspaceId,
    type: "budget_warning",
    severity: "warning",
    title: "Budget limit approaching",
    body: "You've used 87% of your Dining & Food budget for this month.",
    href: "/budgets",
  });

  // AI insight
  await addNotification({
    workspaceId,
    type: "ai_insight",
    severity: "info",
    title: "New AI insight available",
    body: "Your discretionary spending dropped 18% vs last month. Arcana has updated your cash flow forecast.",
    href: "/dashboard",
  });

  // Anomaly
  const anomalyTxn = txns.find((t) => t.transactionType === "expense" && t.amount > 500);
  if (anomalyTxn) {
    await addNotification({
      workspaceId,
      type: "anomaly",
      severity: "critical",
      title: "Unusual spending pattern",
      body: `${anomalyTxn.title} (${formatCurrency(anomalyTxn.amount)}) is 3× your average in this category.`,
      href: "/transactions",
    });
  }

  // Goal progress
  await addNotification({
    workspaceId,
    type: "goal_progress",
    severity: "info",
    title: "Savings goal milestone",
    body: "You've reached 50% of your Emergency Fund goal. On track to complete by July 2026.",
    href: "/goals",
  });
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getNotifications(
  workspaceId: string,
  limit: number = 100
): Promise<Notification[]> {
  try {
    const result = await getDatabase().listDocuments(
      DATABASE_ID,
      COLLECTIONS.notifications,
      [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]
    );

    if (result.documents.length === 0) {
      await seedInitialNotifications(workspaceId);
      const refetched = await getDatabase().listDocuments(
        DATABASE_ID,
        COLLECTIONS.notifications,
        [
          Query.equal("workspaceId", workspaceId),
          Query.orderDesc("$createdAt"),
          Query.limit(limit),
        ]
      );
      return refetched.documents.map(toNotification);
    }

    return result.documents.map(toNotification);
  } catch (err) {
    console.error("Failed to fetch notifications from DB:", err);
    return [];
  }
}

export async function getUnreadCount(workspaceId: string): Promise<number> {
  try {
    const result = await getDatabase().listDocuments(
      DATABASE_ID,
      COLLECTIONS.notifications,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("read", false),
        Query.limit(1),
      ]
    );
    return result.total;
  } catch {
    return 0;
  }
}

export async function markRead(notificationId: string): Promise<void> {
  try {
    await getDatabase().updateDocument(
      DATABASE_ID,
      COLLECTIONS.notifications,
      notificationId,
      { read: true }
    );
  } catch (err) {
    console.error(`Failed to mark notification ${notificationId} as read:`, err);
  }
}

export async function markAllRead(workspaceId: string): Promise<void> {
  try {
    const result = await getDatabase().listDocuments(
      DATABASE_ID,
      COLLECTIONS.notifications,
      [
        Query.equal("workspaceId", workspaceId),
        Query.equal("read", false),
        Query.limit(100),
      ]
    );

    await Promise.all(
      result.documents.map((doc) =>
        getDatabase().updateDocument(
          DATABASE_ID,
          COLLECTIONS.notifications,
          doc.$id,
          { read: true }
        )
      )
    );
  } catch (err) {
    console.error(`Failed to mark all notifications as read for workspace ${workspaceId}:`, err);
  }
}

export async function addNotification(
  notification: Omit<Notification, "id" | "read" | "createdAt">
): Promise<Notification> {
  const data: Record<string, any> = {
    workspaceId: notification.workspaceId,
    type: notification.type,
    severity: notification.severity,
    title: notification.title,
    body: notification.body,
    read: false,
  };
  if (notification.href) data.href = notification.href;
  if (notification.alertRuleId) data.alertRuleId = notification.alertRuleId;

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.notifications,
    generateId("notif"),
    data
  );
  return toNotification(doc);
}

export { type Transaction };
