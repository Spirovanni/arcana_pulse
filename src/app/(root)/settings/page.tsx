"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, ShieldOff, Copy, Check, Clock, Activity, Download, Trash2, AlertTriangle, Bell } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import TeamSettings from "@/components/TeamSettings";
import BillingSettings from "@/components/BillingSettings";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/services/db/auditLog";
import type { Workspace, User } from "@/lib/types";

type MfaView = "idle" | "setup" | "confirm" | "recovery";

const ACTION_LABELS: Record<string, string> = {
  sign_in: "Sign In",
  sign_out: "Sign Out",
  sign_up: "Sign Up",
  mfa_enable: "MFA Enabled",
  mfa_disable: "MFA Disabled",
  mfa_verify: "MFA Verified",
  password_reset: "Password Reset",
  email_verify: "Email Verified",
  transaction_create: "Transaction Created",
  transaction_update: "Transaction Updated",
  transaction_delete: "Transaction Deleted",
  transfer_create: "Transfer Created",
  bank_link: "Bank Linked",
  bank_remove: "Bank Removed",
  settings_change: "Settings Changed",
  export_data: "Data Exported",
};

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const [workspaceState, setWorkspaceState] = useState<Workspace | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaView, setMfaView] = useState<MfaView>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [preferences, setPreferences] = useState({ email: true, in_app: true });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.preferences) {
          setPreferences(data.preferences);
        }
      })
      .catch((err) => console.error("Failed to fetch preferences:", err))
      .finally(() => setPrefsLoading(false));
  }, []);

  async function handleSavePrefs() {
    setPrefsSaving(true);
    setPrefsMessage("");
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save preferences");
      setPrefsMessage("Preferences saved successfully!");
      setTimeout(() => setPrefsMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setPrefsMessage(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setSettingsLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSettingsData() {
      setSettingsLoading(true);
      try {
        const res = await fetch("/api/workspace");
        const data = await res.json().catch(() => ({} as { workspace?: Workspace; user?: User }));
        if (!cancelled && res.ok) {
          setWorkspaceState(data.workspace ?? null);
          setProfileUser(data.user ?? null);
        }
      } catch (err) {
        console.error("Failed to fetch workspace settings:", err);
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    }

    void loadSettingsData();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (settingsLoading || status === "loading") {
    return (
      <div className="rounded-sm bg-surface-container-high border border-outline p-6 animate-pulse h-40" />
    );
  }

  if (!workspaceState) return null;

  const role = profileUser?.role ?? session?.user?.role ?? "viewer";
  const displayName =
    profileUser
      ? `${profileUser.firstName} ${profileUser.lastName}`.trim()
      : `${session?.user?.firstName ?? ""} ${session?.user?.lastName ?? ""}`.trim();
  const displayEmail = profileUser?.email ?? session?.user?.email ?? "";

  async function handleToggleTrading() {
    if (!workspaceState) return;
    setToggleLoading(true);
    try {
      const newPausedState = !workspaceState.tradingPaused;
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceState.workspaceId,
          tradingPaused: newPausedState,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error ?? "Failed to update workspace");
      setWorkspaceState(updated);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to toggle paper trading status");
    } finally {
      setToggleLoading(false);
    }
  }


  async function startSetup() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setMfaView("setup");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to start setup");
    } finally {
      setMfaLoading(false);
    }
  }

  async function confirmEnable() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecoveryCodes(data.recoveryCodes);
      setMfaEnabled(true);
      setVerifyCode("");
      setMfaView("recovery");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMfa() {
    setMfaError("");
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/disable", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disable MFA");
      setMfaEnabled(false);
      setMfaView("idle");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setMfaLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch("/api/account/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arcana-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletePhase("deleting");
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Deletion failed");
      }
      // Sign out and redirect after successful deletion
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed");
      setDeletePhase("confirm");
    }
  }

  async function loadAuditLogs() {
    if (!workspaceState) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/audit?workspaceId=${workspaceState.workspaceId}&limit=30`);
      const data = await res.json();
      setAuditLogs(data.logs ?? []);
      setAuditLoaded(true);
    } catch {
      setAuditLogs([]);
      setAuditLoaded(true);
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-on-surface tracking-tight">Settings</h1>
        <p className="text-sm text-secondary mt-1">
          Manage your workspace and account preferences
        </p>
      </div>

      {/* Workspace Info */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-4">Workspace</h3>
        <div className="space-y-0">
          {[
            { label: "Workspace Name", value: workspaceState.name },
            { label: "Plan", value: <span className="capitalize">{workspaceState.plan}</span> },
            {
              label: "Status",
              value: (
                <span className="inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-arcana-success">
                  {workspaceState.status}
                </span>
              ),
            },
            { label: "Created", value: formatDate(workspaceState.createdAt) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className={`flex flex-col sm:flex-row sm:justify-between gap-1 py-3 ${i < arr.length - 1 ? "border-b border-outline/40" : ""}`}
            >
              <span className="text-xs text-secondary uppercase tracking-wider">{label}</span>
              <span className="text-sm text-on-surface">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Paper Trading Controls */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Paper Trading Risk Controls</h3>
        </div>
        <p className="text-xs text-secondary mb-5">
          Workspace-wide controls to halt paper execution simulated orders.
        </p>

        <div className="flex items-center justify-between gap-4 py-4 border-t border-outline/40">
          <div>
            <p className="text-sm text-on-surface font-medium">Paper Trading Status</p>
            <p className="text-xs text-secondary mt-0.5">
              {workspaceState.tradingPaused
                ? "Trading is currently PAUSED. Submitting new paper orders is disabled."
                : "Trading is ACTIVE. Workspace members can submit paper orders."}
            </p>
          </div>
          <button
            type="button"
            disabled={!["owner", "admin"].includes(role) || toggleLoading}
            onClick={handleToggleTrading}
            className={`flex-shrink-0 px-4 py-2.5 rounded-sm border text-[10px] uppercase tracking-[1px] font-bold transition-all ${
              workspaceState.tradingPaused
                ? "bg-green-500/10 border-green-500/30 text-arcana-success hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/30 text-arcana-danger hover:bg-red-500/20"
            } disabled:opacity-40`}
          >
            {toggleLoading ? "Updating..." : workspaceState.tradingPaused ? "Resume Trading" : "Pause Trading"}
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-4">Profile</h3>
        <div className="space-y-0">
          {[
            { label: "Name", value: displayName || "—" },
            { label: "Email", value: displayEmail || "—" },
            { label: "Role", value: <span className="capitalize">{role}</span> },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className={`flex flex-col sm:flex-row sm:justify-between gap-1 py-3 ${i < arr.length - 1 ? "border-b border-outline/40" : ""}`}
            >
              <span className="text-xs text-secondary uppercase tracking-wider">{label}</span>
              <span className="text-sm text-on-surface">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Notification Preferences</h3>
        </div>
        <p className="text-xs text-secondary mb-5">
          Configure how you want to receive alerts, signals, and system updates.
        </p>

        {prefsLoading ? (
          <p className="text-xs text-secondary/50 animate-pulse">Loading preferences...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-outline/40">
              <div>
                <p className="text-sm text-on-surface font-medium">In-App Inbox Alerts</p>
                <p className="text-xs text-secondary mt-0.5">Receive alerts inside the platform notifications center.</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-primary/60 bg-primary/5 px-2 py-1 rounded-sm">Always On</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-on-surface font-medium">Email Alerts</p>
                <p className="text-xs text-secondary mt-0.5">Receive copy of alerts and strategy signals via email.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.checked }))}
                className="size-4 rounded-sm border-outline bg-surface-container text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-outline/40">
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={prefsSaving}
                className="btn-metallic px-5 py-2 text-xs uppercase tracking-[2px] font-bold disabled:opacity-50"
              >
                {prefsSaving ? "Saving..." : "Save Preferences"}
              </button>
              {prefsMessage && (
                <span className={`text-xs ${prefsMessage.includes("successfully") ? "text-arcana-success" : "text-arcana-danger"}`}>
                  {prefsMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Two-Factor Authentication</h3>
          </div>
          {mfaEnabled && (
            <span className="text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold bg-green-500/10 text-arcana-success">
              Enabled
            </span>
          )}
        </div>
        <p className="text-xs text-secondary mb-5 mt-2">
          Add an extra layer of security using a TOTP authenticator app (e.g. Google Authenticator, Authy).
        </p>

        {mfaError && (
          <div className="mb-4 rounded-sm bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-arcana-danger">
            {mfaError}
          </div>
        )}

        {mfaView === "idle" && !mfaEnabled && (
          <button
            type="button"
            onClick={startSetup}
            disabled={mfaLoading}
            className="btn-metallic px-5 py-2.5 text-xs uppercase tracking-[2px] font-bold transition-all disabled:opacity-50"
          >
            {mfaLoading ? "Loading..." : "Enable 2FA"}
          </button>
        )}

        {mfaView === "idle" && mfaEnabled && (
          <button
            type="button"
            onClick={disableMfa}
            disabled={mfaLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-red-500/10 border border-red-500/20 text-arcana-danger text-xs font-bold uppercase tracking-[1px] hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <ShieldOff className="h-4 w-4" />
            {mfaLoading ? "Disabling..." : "Disable 2FA"}
          </button>
        )}

        {mfaView === "setup" && (
          <div className="space-y-5">
            <p className="text-sm text-on-surface/80">
              Scan this QR code with your authenticator app:
            </p>
            <div className="flex justify-center">
              {qrDataUrl && (
                <Image src={qrDataUrl} alt="MFA QR Code" width={180} height={180} className="rounded-sm" />
              )}
            </div>
            <div>
              <p className="text-xs text-secondary mb-1.5">Or enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-sm bg-surface-container border border-outline text-xs text-on-surface/70 font-mono break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-2 rounded-sm bg-surface-container border border-outline text-secondary hover:text-primary transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-arcana-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary uppercase tracking-wider mb-1.5">
                Enter the 6-digit code to verify
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2.5 rounded-sm bg-surface-container border border-outline text-on-surface text-sm placeholder:text-secondary/40 focus:outline-none focus:border-primary/50 font-mono tracking-widest text-center transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmEnable}
                disabled={mfaLoading || verifyCode.length < 6}
                className="flex-1 py-2.5 btn-metallic text-xs font-bold uppercase tracking-[2px] disabled:opacity-50"
              >
                {mfaLoading ? "Verifying..." : "Activate 2FA"}
              </button>
              <button
                type="button"
                onClick={() => { setMfaView("idle"); setVerifyCode(""); setMfaError(""); }}
                className="px-4 py-2.5 rounded-sm border border-outline text-secondary text-xs hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mfaView === "recovery" && (
          <div className="space-y-4">
            <div className="rounded-sm bg-amber-500/5 border border-amber-500/20 p-4">
              <p className="text-xs text-arcana-warning font-bold uppercase tracking-wider mb-1">Save your recovery codes</p>
              <p className="text-xs text-secondary mt-1">
                Store these codes in a safe place. Each can only be used once if you lose access to your authenticator.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code) => (
                <code key={code} className="px-3 py-1.5 rounded-sm bg-surface-container border border-outline text-xs text-on-surface/70 font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMfaView("idle")}
              className="w-full py-2.5 btn-metallic text-xs font-bold uppercase tracking-[2px]"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Viewer */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Account Activity</h3>
          </div>
          <button
            type="button"
            onClick={loadAuditLogs}
            disabled={auditLoading}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[1px] text-secondary hover:text-primary transition-colors disabled:opacity-40"
          >
            <Clock className={`w-3 h-3 ${auditLoading ? "animate-spin" : ""}`} />
            {auditLoaded ? "Refresh" : "Load Logs"}
          </button>
        </div>

        {!auditLoaded && (
          <p className="text-xs text-secondary/50 text-center py-6">
            Click &quot;Load Logs&quot; to view recent account activity.
          </p>
        )}

        {auditLoaded && auditLogs.length === 0 && (
          <p className="text-xs text-secondary/50 text-center py-6">
            No audit logs available. Logs are stored in Appwrite when configured.
          </p>
        )}

        {auditLoaded && auditLogs.length > 0 && (
          <div className="space-y-0">
            {auditLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center justify-between py-3 ${i < auditLogs.length - 1 ? "border-b border-outline/40" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-on-surface font-medium">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </p>
                    <p className="text-[10px] text-secondary font-mono mt-0.5 truncate">
                      {log.targetEntity}{log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}{log.ipAddress ? ` · ${log.ipAddress}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-secondary/60 font-mono flex-shrink-0 ml-4">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Members */}
      <TeamSettings />

      {/* Privacy & Data Controls */}
      <div className="rounded-sm bg-surface-container-high border border-outline p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-4 w-4 text-primary" />
          <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Privacy & Data Controls</h3>
        </div>
        <p className="text-xs text-secondary mb-5">
          Under CCPA and GDPR, you have the right to access and delete your personal data. These actions are permanent and cannot be undone.
        </p>

        <div className="space-y-4">
          {/* Data Export */}
          <div className="flex items-start justify-between gap-4 py-4 border-b border-outline/40">
            <div>
              <p className="text-sm text-on-surface font-medium">Export your data</p>
              <p className="text-xs text-secondary mt-0.5">Download all your personal data as a JSON file, including transactions, banks, and audit log.</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportLoading}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm border border-outline text-secondary text-xs uppercase tracking-[1px] font-bold hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              {exportLoading ? "Exporting..." : "Export JSON"}
            </button>
          </div>

          {/* Account Deletion */}
          <div className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="text-sm text-on-surface font-medium">Delete account</p>
              <p className="text-xs text-secondary mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            {deletePhase === "idle" && (
              <button
                type="button"
                onClick={() => setDeletePhase("confirm")}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm border border-red-500/30 text-arcana-danger text-xs uppercase tracking-[1px] font-bold hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            )}
            {deletePhase !== "idle" && (
              <div className="flex-shrink-0" />
            )}
          </div>

          {/* Confirm deletion */}
          {(deletePhase === "confirm" || deletePhase === "deleting") && (
            <div className="rounded-sm bg-red-500/5 border border-red-500/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-arcana-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-arcana-danger font-bold uppercase tracking-wider mb-1">This is permanent</p>
                  <p className="text-xs text-secondary leading-relaxed">
                    All your transactions, bank connections, AI insights, budgets, goals, and audit logs will be permanently erased. Your account cannot be recovered.
                  </p>
                </div>
              </div>
              {deleteError && (
                <p className="text-xs text-arcana-danger">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletePhase === "deleting"}
                  className="px-5 py-2.5 rounded-sm bg-red-500/10 border border-red-500/30 text-arcana-danger text-xs font-bold uppercase tracking-[1px] hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {deletePhase === "deleting" ? "Deleting..." : "Yes, permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeletePhase("idle"); setDeleteError(""); }}
                  disabled={deletePhase === "deleting"}
                  className="px-4 py-2.5 rounded-sm border border-outline text-secondary text-xs hover:text-on-surface transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription & Billing */}
      <Suspense fallback={<div className="rounded-sm bg-surface-container-high border border-outline p-6 animate-pulse h-40" />}>
        <BillingSettings currentPlan={workspaceState.plan} />
      </Suspense>

      {/* Sandbox Notice */}
      <div className="rounded-sm bg-amber-500/5 border border-amber-500/20 p-5">
        <p className="text-xs text-arcana-warning font-bold uppercase tracking-wider mb-1">
          Sandbox Environment
        </p>
        <p className="text-xs text-secondary mt-1">
          This is a sandbox instance of Arcana Credit Union. No real financial
          transactions are processed. Data shown is for demonstration and
          development purposes only.
        </p>
      </div>
    </div>
  );
}
