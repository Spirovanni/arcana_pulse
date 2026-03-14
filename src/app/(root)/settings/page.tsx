import { mockWorkspace, mockUser } from "@/lib/mock/data";

export default function SettingsPage() {
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
          <div className="flex justify-between py-2 border-b border-arcana-border">
            <span className="text-slate-400">Workspace Name</span>
            <span className="text-white">{mockWorkspace.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-arcana-border">
            <span className="text-slate-400">Plan</span>
            <span className="text-white capitalize">{mockWorkspace.plan}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-arcana-border">
            <span className="text-slate-400">Status</span>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-arcana-success">
              {mockWorkspace.status}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Created</span>
            <span className="text-white">
              {new Date(mockWorkspace.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Profile</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-arcana-border">
            <span className="text-slate-400">Name</span>
            <span className="text-white">
              {mockUser.firstName} {mockUser.lastName}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-arcana-border">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{mockUser.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Role</span>
            <span className="text-white capitalize">{mockUser.role}</span>
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
