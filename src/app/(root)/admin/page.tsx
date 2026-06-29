"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  BarChart3,
  Flag,
  TicketIcon,
  Search,
  RefreshCw,
  TrendingUp,
  Activity,
  DollarSign,
  UserPlus,
  Shield,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import type { PlatformMetrics, AdminUser, FeatureFlag, SupportTicket } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "flags" | "tickets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

const TICKET_STATUS_STYLES: Record<SupportTicket["status"], string> = {
  open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-300 border-green-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const TICKET_PRIORITY_STYLES: Record<SupportTicket["priority"], string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  icon: Icon,
  sub,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Failed to load metrics");
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-400 text-sm">{error}</p>
        <button onClick={load} className="text-xs text-arcana-blue hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const m = metrics!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Platform Overview</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Users"
          value={m.totalUsers.toLocaleString()}
          icon={Users}
          sub={`+${m.newUsersLast30Days} last 30 days`}
          color="bg-arcana-blue/20 text-arcana-blue"
        />
        <MetricCard
          label="Active Workspaces"
          value={m.activeWorkspaces.toLocaleString()}
          icon={Activity}
          color="bg-purple-500/20 text-purple-400"
        />
        <MetricCard
          label="Transaction Volume"
          value={formatCurrency(m.totalTransactionVolume)}
          icon={TrendingUp}
          sub={`${m.totalTransactionCount.toLocaleString()} transactions`}
          color="bg-green-500/20 text-green-400"
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(m.totalRevenue)}
          icon={DollarSign}
          sub="Stripe billing aggregate"
          color="bg-yellow-500/20 text-yellow-400"
        />
        <MetricCard
          label="New Users (30d)"
          value={m.newUsersLast30Days.toLocaleString()}
          icon={UserPlus}
          color="bg-cyan-500/20 text-cyan-400"
        />
      </div>

      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-4">
        <p className="text-xs text-slate-500">
          Last refreshed: {formatDate(m.generatedAt)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    if (q) setSearching(true);
    else setLoading(true);
    try {
      const url = q.length >= 2
        ? `/api/admin/users?q=${encodeURIComponent(q)}`
        : "/api/admin/users";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 400);
    return () => clearTimeout(t);
  }, [query, load]);

  async function patchUser(
    userId: string,
    updates: Partial<Pick<AdminUser, "role" | "membershipType" | "emailVerified">>
  ) {
    setUpdatingUserId(userId);
    setUpdateError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; user?: AdminUser }));
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.userId === userId ? data.user : u)));
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          User Lookup <span className="text-slate-500 text-sm font-normal">({total} total)</span>
        </h2>
      </div>
      {updateError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {updateError}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arcana-blue animate-spin" />
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <Users className="w-8 h-8 text-slate-600" />
          <p className="text-slate-400 text-sm">No users found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-arcana-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-arcana-surface border-b border-arcana-border">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">User</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Workspace</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.userId}
                  className={`border-b border-arcana-border/50 hover:bg-arcana-navy/40 transition-colors ${
                    i === users.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-slate-400 text-xs">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <select
                      value={u.membershipType}
                      disabled={updatingUserId === u.userId}
                      onChange={(e) =>
                        void patchUser(u.userId, {
                          membershipType: e.target.value as AdminUser["membershipType"],
                        })
                      }
                      className="rounded bg-arcana-navy border border-arcana-border px-2 py-1 text-[10px] text-slate-200"
                    >
                      <option value="standard">standard</option>
                      <option value="student">student</option>
                      <option value="employer">employer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={u.role}
                      disabled={updatingUserId === u.userId}
                      onChange={(e) =>
                        void patchUser(u.userId, {
                          role: e.target.value as AdminUser["role"],
                        })
                      }
                      className="rounded bg-arcana-navy border border-arcana-border px-2 py-1 text-[10px] text-slate-200"
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-slate-400 font-mono text-xs">
                      {u.workspaceId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={updatingUserId === u.userId}
                      onClick={() =>
                        void patchUser(u.userId, { emailVerified: !u.emailVerified })
                      }
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border border-arcana-border hover:border-arcana-blue/40"
                    >
                      {u.emailVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-300">Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-400">Unverified</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-lg border border-arcana-border bg-arcana-surface px-3 py-2 text-[11px] text-slate-400 flex items-center gap-2">
        <BadgeCheck className="w-3.5 h-3.5 text-arcana-blue" />
        User role, membership type, and verification status can be managed inline.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature flags tab
// ---------------------------------------------------------------------------

function FlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFlags(data.flags ?? []);
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(flag: FeatureFlag) {
    setToggling(flag.flagId);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: flag.flagId,
          enabled: !flag.enabled,
          rolloutPercentage: !flag.enabled ? 100 : 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlags((prev) =>
          prev.map((f) => (f.flagId === flag.flagId ? data.flag : f))
        );
      }
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.flagId}
              className="rounded-xl bg-arcana-surface border border-arcana-border p-4 flex items-center gap-4"
            >
              {/* Toggle */}
              <button
                onClick={() => toggle(flag)}
                disabled={toggling === flag.flagId}
                className="flex-shrink-0 transition-colors disabled:opacity-50"
                title={flag.enabled ? "Disable" : "Enable"}
              >
                {toggling === flag.flagId ? (
                  <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
                ) : flag.enabled ? (
                  <ToggleRight className="w-8 h-8 text-green-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-500" />
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{flag.label}</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-arcana-navy px-1.5 py-0.5 rounded">
                    {flag.key}
                  </span>
                  {flag.enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                      {flag.rolloutPercentage}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{flag.description}</p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {flag.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Changes take effect immediately. Feature flags persist in Appwrite.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tickets tab
// ---------------------------------------------------------------------------

function TicketsTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<SupportTicket["status"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/tickets"
          : `/api/admin/tickets?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(ticketId: string, status: SupportTicket["status"]) {
    setUpdating(ticketId);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets((prev) =>
          prev.map((t) => (t.ticketId === ticketId ? data.ticket : t))
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  const STATUS_ICON: Record<SupportTicket["status"], React.ReactNode> = {
    open: <AlertCircle className="w-3.5 h-3.5" />,
    in_progress: <Clock className="w-3.5 h-3.5" />,
    resolved: <CheckCircle2 className="w-3.5 h-3.5" />,
    closed: <XCircle className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">
          Support Tickets <span className="text-slate-500 text-sm font-normal">({total})</span>
        </h2>
        <div className="flex gap-1.5">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                statusFilter === s
                  ? "bg-arcana-blue text-white"
                  : "bg-arcana-surface border border-arcana-border text-slate-400 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <TicketIcon className="w-8 h-8 text-slate-600" />
          <p className="text-slate-400 text-sm">No tickets found</p>
          <p className="text-xs text-slate-600 text-center max-w-xs">
            Tickets are created when users submit support requests through the app.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div
              key={t.ticketId}
              className="rounded-xl bg-arcana-surface border border-arcana-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TICKET_STATUS_STYLES[t.status]}`}
                    >
                      {STATUS_ICON[t.status]}
                      {t.status.replace("_", " ")}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TICKET_PRIORITY_STYLES[t.priority]}`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-white font-medium text-sm">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.userEmail} · {formatDate(t.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{t.body}</p>
                </div>

                {/* Quick actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {t.status === "open" && (
                    <button
                      onClick={() => updateStatus(t.ticketId, "in_progress")}
                      disabled={updating === t.ticketId}
                      className="text-[10px] px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  {(t.status === "open" || t.status === "in_progress") && (
                    <button
                      onClick={() => updateStatus(t.ticketId, "resolved")}
                      disabled={updating === t.ticketId}
                      className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
                  {t.status === "resolved" && (
                    <button
                      onClick={() => updateStatus(t.ticketId, "closed")}
                      disabled={updating === t.ticketId}
                      className="text-[10px] px-2 py-1 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30 transition-colors disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "tickets", label: "Tickets", icon: TicketIcon },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => setAuthorized(r.ok))
      .catch(() => setAuthorized(false));
  }, []);

  // Auth check loading
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-arcana-blue animate-spin" />
      </div>
    );
  }

  // Not a platform admin
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-1">
            Platform admin access is required to view this page.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Contact your system administrator to be added to the ADMIN_USER_IDS list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
              Platform Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform-wide metrics, user management, and configuration
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 mt-1" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-arcana-surface border border-arcana-border w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === id
                ? "bg-arcana-blue text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "flags" && <FlagsTab />}
        {tab === "tickets" && <TicketsTab />}
      </div>
    </div>
  );
}
