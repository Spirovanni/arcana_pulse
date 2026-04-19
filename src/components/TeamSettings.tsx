"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Crown, Shield, Eye, User, Trash2, Mail, Copy, Check, RefreshCw } from "lucide-react";
import type { WorkspaceMember, WorkspaceInvite, UserRole } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { cn } from "@/lib/utils";

const ROLE_META: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  owner:  { label: "Owner",  icon: Crown,  color: "text-primary" },
  admin:  { label: "Admin",  icon: Shield, color: "text-arcana-warning" },
  member: { label: "Member", icon: User,   color: "text-on-surface/70" },
  viewer: { label: "Viewer", icon: Eye,    color: "text-secondary" },
};

const ASSIGNABLE_ROLES: UserRole[] = ["admin", "member", "viewer"];

export default function TeamSettings() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  async function fetchTeam() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/members?workspaceId=${DEFAULT_WORKSPACE_ID}`);
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTeam(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, workspaceId: DEFAULT_WORKSPACE_ID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteSuccess(data.emailSent
        ? `Invite sent to ${inviteEmail}`
        : `Invite created. Share this link: ${data.acceptUrl}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: UserRole) {
    await fetch("/api/workspace/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    fetchTeam();
  }

  async function handleRemoveMember(memberId: string) {
    await fetch(`/api/workspace/members?memberId=${memberId}&workspaceId=${DEFAULT_WORKSPACE_ID}`, { method: "DELETE" });
    fetchTeam();
  }

  async function handleRevokeInvite(inviteId: string) {
    await fetch(`/api/workspace/members?inviteId=${inviteId}`, { method: "DELETE" });
    fetchTeam();
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  return (
    <div className="rounded-sm bg-surface-container-high border border-outline p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Team Members</h3>
        </div>
        <button type="button" onClick={fetchTeam} className="p-1 text-secondary/40 hover:text-secondary transition-colors">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Member list */}
      <div className="space-y-0">
        {members.map((m, i) => {
          const meta = ROLE_META[m.role];
          const Icon = meta.icon;
          return (
            <div
              key={m.memberId}
              className={cn(
                "flex items-center justify-between py-3 gap-4",
                i < members.length - 1 && "border-b border-outline/40"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-8 rounded-sm bg-surface-container border border-outline flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-secondary">
                    {m.firstName[0]}{m.lastName[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-on-surface font-medium truncate">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-[10px] text-secondary font-mono truncate">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {m.role === "owner" ? (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-primary">
                    <Icon className="size-3" />
                    {meta.label}
                  </span>
                ) : (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.memberId, e.target.value as UserRole)}
                    className="bg-surface-container border border-outline text-on-surface text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-sm focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                )}
                {m.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.memberId)}
                    className="p-1.5 text-secondary/40 hover:text-arcana-danger transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Pending Invites ({invites.length})</p>
          <div className="space-y-0">
            {invites.map((inv, i) => (
              <div
                key={inv.inviteId}
                className={cn(
                  "flex items-center justify-between py-2.5 gap-3",
                  i < invites.length - 1 && "border-b border-outline/30"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="size-3.5 text-secondary/50 flex-shrink-0" />
                  <span className="text-xs text-secondary truncate">{inv.email}</span>
                  <span className="text-[9px] text-secondary/50 uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded-sm">
                    {inv.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inv.token)}
                    className="p-1.5 text-secondary/40 hover:text-primary transition-colors"
                    title="Copy invite link"
                  >
                    {copiedLink === inv.token ? <Check className="size-3.5 text-arcana-success" /> : <Copy className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(inv.inviteId)}
                    className="p-1.5 text-secondary/40 hover:text-arcana-danger transition-colors"
                    title="Revoke invite"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <div className="pt-4 border-t border-outline/40 space-y-3">
        <p className="text-[9px] uppercase tracking-[2px] text-secondary font-bold flex items-center gap-2">
          <UserPlus className="size-3.5" />
          Invite Member
        </p>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="flex-1 px-3 py-2 bg-surface-container border border-outline text-on-surface text-xs placeholder:text-secondary/40 rounded-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="bg-surface-container border border-outline text-on-surface text-xs px-2 py-2 rounded-sm focus:outline-none focus:border-primary/50 transition-colors"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
          </div>

          {inviteError && <p className="text-xs text-arcana-danger">{inviteError}</p>}
          {inviteSuccess && <p className="text-xs text-arcana-success">{inviteSuccess}</p>}

          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="w-full btn-metallic py-2.5 text-xs font-bold uppercase tracking-[2px] disabled:opacity-40"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>

        {/* Role legend */}
        <div className="grid grid-cols-2 gap-1 pt-1">
          {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([role, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={role} className="flex items-center gap-1.5">
                <Icon className={cn("size-3 flex-shrink-0", meta.color)} />
                <span className="text-[10px] text-secondary/60">
                  <span className={cn("font-bold", meta.color)}>{meta.label}</span>
                  {role === "owner" && " — full control"}
                  {role === "admin" && " — manage members"}
                  {role === "member" && " — read & write"}
                  {role === "viewer" && " — read only"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
