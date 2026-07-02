"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, AlertTriangle, BarChart3, Zap, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Notification, NotificationType } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  large_transaction: AlertTriangle,
  budget_warning: AlertTriangle,
  anomaly: AlertTriangle,
  ai_insight: BarChart3,
  transfer_status: Zap,
  goal_progress: Target,
  price_threshold: TrendingUp,
  strategy_signal: Zap,
  paper_order_event: Bell,
  risk_limit_breach: AlertTriangle,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  large_transaction: "Large Transaction",
  budget_warning: "Budget Warning",
  anomaly: "Anomaly",
  ai_insight: "AI Insight",
  transfer_status: "Transfer",
  goal_progress: "Goal Progress",
  price_threshold: "Price Threshold",
  strategy_signal: "Strategy Signal",
  paper_order_event: "Paper Order",
  risk_limit_breach: "Risk Limit Breach",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-arcana-danger",
  warning: "bg-arcana-warning",
  info: "bg-primary",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function fetchNotifications() {
    const res = await fetch(`/api/notifications?workspaceId=${DEFAULT_WORKSPACE_ID}`);
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchNotifications(); }, []);

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true, workspaceId: DEFAULT_WORKSPACE_ID }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light text-on-surface tracking-tight">Notifications</h1>
          <p className="text-sm text-secondary mt-1">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm border border-outline text-secondary text-xs uppercase tracking-[1px] font-bold hover:border-primary/40 hover:text-primary transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-outline/40">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 text-xs uppercase tracking-[2px] font-bold border-b-2 -mb-px transition-colors",
              filter === f
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-on-surface"
            )}
          >
            {f === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center">
          <Bell className="size-5 text-secondary/40 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-secondary/50 uppercase tracking-wider">Loading...</p>
        </div>
      )}

      {!loading && displayed.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-12 text-center">
          <Bell className="size-6 text-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-secondary">No {filter === "unread" ? "unread " : ""}notifications</p>
        </div>
      )}

      {!loading && displayed.length > 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline overflow-hidden">
          {displayed.map((n, i) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-6 py-4 transition-colors",
                  i < displayed.length - 1 && "border-b border-outline/30",
                  !n.read ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-surface-container"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "mt-0.5 p-2 rounded-sm flex-shrink-0",
                  n.severity === "critical" ? "bg-red-500/10" : n.severity === "warning" ? "bg-amber-500/10" : "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "size-4",
                    n.severity === "critical" ? "text-arcana-danger" : n.severity === "warning" ? "text-arcana-warning" : "text-primary"
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">
                          {TYPE_LABEL[n.type]}
                        </span>
                        {!n.read && (
                          <span className={cn("size-1.5 rounded-full flex-shrink-0", SEVERITY_DOT[n.severity])} />
                        )}
                      </div>
                      <p className={cn("text-sm font-medium leading-snug", n.read ? "text-secondary" : "text-on-surface")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-secondary/70 mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-secondary/40 mt-2 font-mono">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {n.href && (
                        <Link
                          href={n.href}
                          className="text-[10px] uppercase tracking-wider text-secondary hover:text-primary transition-colors"
                        >
                          View →
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markOne(n.id)}
                          className="text-[10px] uppercase tracking-wider text-secondary/50 hover:text-primary transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
