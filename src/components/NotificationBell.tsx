"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, AlertTriangle, Zap, TrendingUp, Target, BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Notification, NotificationType } from "@/lib/services/notifications";
import { cn, formatDate } from "@/lib/utils";

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  large_transaction: AlertTriangle,
  budget_warning: AlertTriangle,
  anomaly: AlertTriangle,
  ai_insight: BarChart3,
  transfer_status: Zap,
  goal_progress: Target,
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-arcana-danger",
  warning: "bg-arcana-warning",
  info: "bg-primary",
};

export default function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  async function fetchNotifications() {
    const res = await fetch(`/api/notifications?workspaceId=${workspaceId}`);
    const data = await res.json();
    setNotifications(data.notifications ?? []);
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
      body: JSON.stringify({ all: true, workspaceId }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-secondary hover:text-primary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 size-4 rounded-full bg-arcana-danger text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-surface-container-high border border-outline shadow-2xl z-50 rounded-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline/40">
            <span className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">
              Notifications {unread > 0 && <span className="text-primary">({unread} new)</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-secondary hover:text-primary transition-colors"
                >
                  <CheckCheck className="size-3" />
                  All read
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[10px] uppercase tracking-wider text-secondary hover:text-primary transition-colors"
              >
                View all
              </Link>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="size-5 text-secondary/40 mx-auto mb-2" />
                <p className="text-xs text-secondary/50">No notifications</p>
              </div>
            )}
            {notifications.slice(0, 8).map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-outline/30 last:border-0 hover:bg-surface-container transition-colors",
                    !n.read && "bg-primary/[0.03]"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={cn("size-1.5 rounded-full mt-1.5", n.read ? "bg-outline" : SEVERITY_DOT[n.severity])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-medium leading-snug", n.read ? "text-secondary" : "text-on-surface")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markOne(n.id)}
                          className="flex-shrink-0 p-0.5 text-secondary/40 hover:text-secondary transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-secondary/70 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                    <p className="text-[9px] text-secondary/40 mt-1 font-mono">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
