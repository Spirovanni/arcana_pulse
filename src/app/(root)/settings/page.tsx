"use client";

import { useState } from "react";
import { getWorkspace, getCurrentUser, DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import Image from "next/image";

type MfaView = "idle" | "setup" | "confirm" | "recovery";

export default function SettingsPage() {
  const workspace = getWorkspace(DEFAULT_WORKSPACE_ID);
  const user = getCurrentUser();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaView, setMfaView] = useState<MfaView>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!workspace) return null;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your workspace and account preferences
        </p>
      </div>

      {/* Workspace Info */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Workspace</h3>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-arcana-border">
            <span className="text-slate-400">Workspace Name</span>
            <span className="text-white">{workspace.name}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-arcana-border">
            <span className="text-slate-400">Plan</span>
            <span className="text-white capitalize">{workspace.plan}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-arcana-border">
            <span className="text-slate-400">Status</span>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-arcana-success">
              {workspace.status}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2">
            <span className="text-slate-400">Created</span>
            <span className="text-white">
              {new Date(workspace.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Profile</h3>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-arcana-border">
            <span className="text-slate-400">Name</span>
            <span className="text-white">
              {user.firstName} {user.lastName}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-arcana-border">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2">
            <span className="text-slate-400">Role</span>
            <span className="text-white capitalize">{user.role}</span>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-arcana-sky" />
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication</h3>
          </div>
          {mfaEnabled && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-arcana-success font-medium">
              Enabled
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Add an extra layer of security using a TOTP authenticator app (e.g. Google Authenticator, Authy).
        </p>

        {mfaError && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {mfaError}
          </div>
        )}

        {/* Idle: not enabled */}
        {mfaView === "idle" && !mfaEnabled && (
          <button
            type="button"
            onClick={startSetup}
            disabled={mfaLoading}
            className="px-4 py-2 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {mfaLoading ? "Loading..." : "Enable 2FA"}
          </button>
        )}

        {/* Enabled: show disable option */}
        {mfaView === "idle" && mfaEnabled && (
          <button
            type="button"
            onClick={disableMfa}
            disabled={mfaLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <ShieldOff className="h-4 w-4" />
            {mfaLoading ? "Disabling..." : "Disable 2FA"}
          </button>
        )}

        {/* Setup: show QR code */}
        {mfaView === "setup" && (
          <div className="space-y-5">
            <p className="text-sm text-slate-300">
              Scan this QR code with your authenticator app:
            </p>
            <div className="flex justify-center">
              {qrDataUrl && (
                <Image
                  src={qrDataUrl}
                  alt="MFA QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Or enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-arcana-navy border border-arcana-border text-xs text-slate-300 font-mono break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-2 rounded-lg bg-arcana-navy border border-arcana-border text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-arcana-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Enter the 6-digit code to verify
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue font-mono tracking-widest text-center"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmEnable}
                disabled={mfaLoading || verifyCode.length < 6}
                className="flex-1 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {mfaLoading ? "Verifying..." : "Activate 2FA"}
              </button>
              <button
                type="button"
                onClick={() => { setMfaView("idle"); setVerifyCode(""); setMfaError(""); }}
                className="px-4 py-2.5 rounded-lg border border-arcana-border text-slate-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recovery codes */}
        {mfaView === "recovery" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4">
              <p className="text-sm text-yellow-400 font-medium mb-1">Save your recovery codes</p>
              <p className="text-xs text-slate-400">
                Store these codes in a safe place. Each can only be used once if you lose access to your authenticator.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code) => (
                <code
                  key={code}
                  className="px-3 py-1.5 rounded-lg bg-arcana-navy border border-arcana-border text-xs text-slate-300 font-mono text-center"
                >
                  {code}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMfaView("idle")}
              className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Sandbox Notice */}
      <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-5">
        <p className="text-sm text-yellow-400 font-medium mb-1">
          Sandbox Environment
        </p>
        <p className="text-xs text-slate-400">
          This is a sandbox instance of Arcana Credit Union. No real financial
          transactions are processed. Data shown is for demonstration and
          development purposes only.
        </p>
      </div>
    </div>
  );
}
