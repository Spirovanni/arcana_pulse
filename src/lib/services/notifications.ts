import type { Transaction } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, generateId } from "@/lib/utils";
import { mockTransactions } from "@/lib/mock/data";

export type NotificationType =
  | "large_transaction"
  | "budget_warning"
  | "ai_insight"
  | "transfer_status"
  | "anomaly"
  | "goal_progress";

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
}

// ─── In-memory store ─────────────────────────────────────────────────────────

let store: Notification[] = [];
let seeded = false;

function seedFromTransactions(workspaceId: string): void {
  if (seeded) return;
  seeded = true;

  const txns = mockTransactions.filter((t) => t.workspaceId === workspaceId);

  // Large transactions (top 3 by amount)
  const large = [...txns]
    .filter((t) => t.transactionType === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  large.forEach((txn) => {
    store.push({
      id: generateId("notif"),
      workspaceId,
      type: "large_transaction",
      severity: txn.amount > 1000 ? "warning" : "info",
      title: "Large transaction detected",
      body: `${txn.title} — ${formatCurrency(txn.amount)} in ${CATEGORY_LABELS[txn.category] ?? txn.category}`,
      read: false,
      createdAt: txn.date,
      href: "/transactions",
    });
  });

  // Budget warning — synthetic
  store.push({
    id: generateId("notif"),
    workspaceId,
    type: "budget_warning",
    severity: "warning",
    title: "Budget limit approaching",
    body: "You've used 87% of your Dining & Food budget for this month.",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    href: "/budgets",
  });

  // AI insight
  store.push({
    id: generateId("notif"),
    workspaceId,
    type: "ai_insight",
    severity: "info",
    title: "New AI insight available",
    body: "Your discretionary spending dropped 18% vs last month. Arcana has updated your cash flow forecast.",
    read: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    href: "/dashboard",
  });

  // Anomaly
  const anomalyTxn = txns.find((t) => t.transactionType === "expense" && t.amount > 500);
  if (anomalyTxn) {
    store.push({
      id: generateId("notif"),
      workspaceId,
      type: "anomaly",
      severity: "critical",
      title: "Unusual spending pattern",
      body: `${anomalyTxn.title} (${formatCurrency(anomalyTxn.amount)}) is 3× your average in this category.`,
      read: false,
      createdAt: anomalyTxn.date,
      href: "/transactions",
    });
  }

  // Goal progress
  store.push({
    id: generateId("notif"),
    workspaceId,
    type: "goal_progress",
    severity: "info",
    title: "Savings goal milestone",
    body: "You've reached 50% of your Emergency Fund goal. On track to complete by July 2026.",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    href: "/goals",
  });

  // Sort newest first
  store.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Service functions ────────────────────────────────────────────────────────

export function getNotifications(workspaceId: string): Notification[] {
  seedFromTransactions(workspaceId);
  return store.filter((n) => n.workspaceId === workspaceId);
}

export function getUnreadCount(workspaceId: string): number {
  return getNotifications(workspaceId).filter((n) => !n.read).length;
}

export function markRead(notificationId: string): void {
  const n = store.find((n) => n.id === notificationId);
  if (n) n.read = true;
}

export function markAllRead(workspaceId: string): void {
  store.filter((n) => n.workspaceId === workspaceId).forEach((n) => { n.read = true; });
}

export function addNotification(notification: Omit<Notification, "id" | "read" | "createdAt">): Notification {
  const n: Notification = {
    ...notification,
    id: generateId("notif"),
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.unshift(n);
  return n;
}

export { type Transaction };
