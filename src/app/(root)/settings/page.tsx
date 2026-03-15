"use client";

import { getWorkspace, getCurrentUser, DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

export default function SettingsPage() {
  const workspace = getWorkspace(DEFAULT_WORKSPACE_ID);
  const user = getCurrentUser();

  if (!workspace) return null;

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
