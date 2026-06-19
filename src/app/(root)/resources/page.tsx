"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Key,
  X,
  Globe,
  Tag,
  Zap,
  AlertCircle,
} from "lucide-react";
import type { ArcanaResource, McpToken } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResourceForm {
  url: string;
  title: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <BookMarked className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-primary mb-2">Your Resource Vault is empty</h3>
      <p className="text-secondary text-sm max-w-sm mb-6">
        Save your first project link, research source, or documentation reference.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Add Resource
      </button>
    </div>
  );
}

function ResourceCard({
  resource,
  onDelete,
}: {
  resource: ArcanaResource;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${resource.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resources/${resource.resourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onDelete(resource.resourceId);
    } catch {
      alert("Failed to delete resource. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="group bg-background border border-outline rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary truncate">{resource.title}</h3>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors mt-0.5"
          >
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[280px]">{formatDomain(resource.url)}</span>
          </a>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
            title="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
            title="Delete resource"
          >
            {deleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {resource.notes && (
        <p className="text-xs text-secondary mt-2.5 line-clamp-2 leading-relaxed">
          {resource.notes}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-1">
          {resource.resourceType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full">
              <Tag className="w-2.5 h-2.5" />
              {resource.resourceType}
            </span>
          )}
          {resource.source === "mcp" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/20 text-secondary text-[10px] font-medium rounded-full">
              <Zap className="w-2.5 h-2.5" />
              via MCP
            </span>
          )}
          {resource.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-outline text-secondary text-[10px] font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-secondary/60 shrink-0">{formatDate(resource.createdAt)}</span>
      </div>
    </article>
  );
}

function AddResourceForm({
  onSave,
  onClose,
}: {
  onSave: (resource: ArcanaResource) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ResourceForm>({ url: "", title: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.url || !form.title) {
      setError("URL and title are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.url,
          title: form.title,
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save resource.");
        return;
      }

      onSave(data.resource);
      setForm({ url: "", title: "", notes: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background border border-outline rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Add Resource</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">URL *</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Title *</label>
          <input
            type="text"
            placeholder="Resource title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Notes</label>
          <textarea
            placeholder="Optional context about this resource…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-background text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Resource"}
          </button>
        </div>
      </form>
    </div>
  );
}

function McpTokenSection() {
  const [tokens, setTokens] = useState<Omit<McpToken, "tokenHash">[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newRawToken, setNewRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mcp-tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Cursor — ${new Date().toLocaleDateString()}` }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewRawToken(data.rawToken);
        setTokens((prev) => [data.token, ...prev]);
      }
    } catch {
      alert("Failed to generate token");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm("Revoke this token? Any MCP clients using it will stop working.")) return;
    try {
      const res = await fetch(`/api/mcp-tokens/${tokenId}`, { method: "DELETE" });
      if (res.ok) setTokens((prev) => prev.filter((t) => t.tokenId !== tokenId));
    } catch {
      alert("Failed to revoke token");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mcpUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/mcp`
    : "/api/mcp";

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        "arcana-pulse": {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${newRawToken ?? "<YOUR_TOKEN>"}`,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <section className="mt-10 pt-8 border-t border-outline">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-primary flex items-center gap-2">
            <Key className="w-4 h-4" />
            MCP Access Tokens
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Connect Cursor or another MCP client to your Resource Vault.
          </p>
        </div>
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="text-xs text-secondary hover:text-primary transition-colors underline underline-offset-2"
        >
          {showConfig ? "Hide" : "Show"} setup guide
        </button>
      </div>

      {/* Setup guide */}
      {showConfig && (
        <div className="bg-surface border border-outline rounded-xl p-5 mb-5 text-xs">
          <p className="text-secondary mb-3 font-medium">How to connect Cursor:</p>
          <ol className="space-y-2 text-secondary list-decimal list-inside">
            <li>Generate a token below (shown only once).</li>
            <li>
              In Cursor, open <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">Settings → MCP Servers</code> and add:
            </li>
          </ol>
          <div className="mt-3 relative">
            <pre className="bg-background border border-outline rounded-lg p-4 text-[11px] text-primary overflow-x-auto">
              {cursorConfig}
            </pre>
            <button
              onClick={() => handleCopy(cursorConfig)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-outline/50 hover:bg-primary/10 text-secondary hover:text-primary transition-colors"
              title="Copy config"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-secondary/60 mt-2">
            Replace <code>&lt;YOUR_TOKEN&gt;</code> with a generated token. Tokens start with{" "}
            <code className="text-primary">ap_</code>.
          </p>
        </div>
      )}

      {/* New token reveal */}
      {newRawToken && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-amber-400">
              Token generated — copy now, it won't be shown again
            </p>
            <button onClick={() => setNewRawToken(null)} className="text-secondary hover:text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-outline rounded-lg px-3 py-2 text-xs text-primary font-mono break-all">
              {newRawToken}
            </code>
            <button
              onClick={() => handleCopy(newRawToken)}
              className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-outline/50 hover:bg-primary/10 text-secondary hover:text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 mb-4"
      >
        {generating ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        {generating ? "Generating…" : "Generate New Token"}
      </button>

      {/* Token list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-outline/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-xs text-secondary">No tokens yet. Generate one above to get started.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li
              key={t.tokenId}
              className="flex items-center justify-between gap-3 bg-surface border border-outline rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-xs font-medium text-primary">{t.label}</p>
                <p className="text-[10px] text-secondary">
                  Created {formatDate(t.createdAt)}
                  {t.lastUsedAt ? ` · Last used ${formatDate(t.lastUsedAt)}` : " · Never used"}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.tokenId)}
                className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Revoke token"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ResourceVaultPage() {
  const [resources, setResources] = useState<ArcanaResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resources");
      if (!res.ok) {
        if (res.status === 401) {
          setError("You must be signed in to view your resources.");
        } else {
          setError("We could not load your resources. Try again.");
        }
        return;
      }
      const data = await res.json();
      setResources(data.resources ?? []);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSave = (resource: ArcanaResource) => {
    setResources((prev) => [resource, ...prev]);
    setShowForm(false);
  };

  const handleDelete = (resourceId: string) => {
    setResources((prev) => prev.filter((r) => r.resourceId !== resourceId));
  };

  const filtered = search
    ? resources.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.url.toLowerCase().includes(search.toLowerCase()) ||
          r.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : resources;

  return (
    <main className="px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2 font-headline">
            <BookMarked className="w-5 h-5" />
            Resource Vault
          </h1>
          <p className="text-sm text-secondary mt-1 max-w-md">
            Save research, documentation, references, and AI-ready links for your Arcana Pulse workflows.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddResourceForm onSave={handleSave} onClose={() => setShowForm(false)} />
      )}

      {/* Search */}
      {resources.length > 3 && !showForm && (
        <div className="mb-5">
          <input
            type="text"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-2 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}

      {/* Resource list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-outline/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="w-8 h-8 text-secondary mb-3" />
          <p className="text-sm text-secondary mb-4">{error}</p>
          <button
            onClick={fetchResources}
            className="flex items-center gap-2 px-4 py-2 bg-outline/50 hover:bg-primary/10 text-secondary hover:text-primary text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource.resourceId}
              resource={resource}
              onDelete={handleDelete}
            />
          ))}
          {search && filtered.length === 0 && (
            <p className="text-sm text-secondary text-center py-8">
              No resources match &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* MCP token section */}
      <McpTokenSection />
    </main>
  );
}
