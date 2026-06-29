"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

type BuilderForm = {
  companyName: string;
  appName: string;
  agentName: string;
  primaryAudience: string;
  businessContext: string;
  goals: string;
  tone: string;
  complianceNotes: string;
  mustUseEndCall: boolean;
  enableDynamicVariables: boolean;
  includePostCallWebhook: boolean;
};

const DEFAULT_FORM: BuilderForm = {
  companyName: "Arcana Credit Union",
  appName: "Arcana Pulse",
  agentName: "Arcana Voice Advisor",
  primaryAudience:
    "Consumers who need help with budgeting, cash flow, debt payoff, and educational market insights.",
  businessContext:
    "Digital personal finance app with AI assistant, budgeting, portfolio analytics, and paper-trading-only market tools.",
  goals:
    "Help users understand financial status, prioritize actions, and complete app tasks with confidence.",
  tone: "Calm, trustworthy, concise, and non-judgmental",
  complianceNotes:
    "No fabricated financial data. No real-money transfer/trading claims. Educational, not legal/tax advice.",
  mustUseEndCall: true,
  enableDynamicVariables: true,
  includePostCallWebhook: true,
};

export default function AssistantAgentBuilderPage() {
  const [form, setForm] = useState<BuilderForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    exportText: string;
    generatedAt?: string;
    fallbackUsed?: boolean;
  } | null>(null);

  const textOutput = useMemo(() => {
    if (!result?.exportText) return "";
    return result.exportText;
  }, [result]);

  async function generateConfig() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const response = await fetch("/api/ai/assistant/agent-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: DEFAULT_WORKSPACE_ID,
          ...form,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        exportText?: string;
        error?: string;
        generatedAt?: string;
        fallbackUsed?: boolean;
      };
      if (!response.ok || !payload.exportText) {
        throw new Error(payload.error ?? "Failed to generate ElevenLabs prompt export.");
      }
      setResult({
        exportText: payload.exportText,
        generatedAt: payload.generatedAt,
        fallbackUsed: payload.fallbackUsed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate config.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!textOutput) return;
    await navigator.clipboard.writeText(textOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 lg:space-y-6">
      <div className="rounded-2xl border border-arcana-border bg-arcana-surface/80 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">ElevenLabs Agent Builder</h1>
            <p className="mt-1 text-sm text-slate-400">
              Generate a ready-to-paste prompt export tailored to your users.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-arcana-blue/40 bg-arcana-blue/10 px-2.5 py-1 text-xs text-arcana-blue">
            <Sparkles className="h-3.5 w-3.5" />
            AI Generated
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-arcana-border bg-arcana-surface p-4">
          {(
            [
              ["companyName", "Company Name"],
              ["appName", "App Name"],
              ["agentName", "Agent Name"],
              ["primaryAudience", "Primary Audience"],
              ["businessContext", "Business Context"],
              ["goals", "Goal"],
              ["tone", "Tone"],
              ["complianceNotes", "Compliance Notes"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <textarea
                value={form[key]}
                rows={key === "companyName" || key === "appName" || key === "agentName" ? 1 : 3}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
              />
            </label>
          ))}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.mustUseEndCall}
                onChange={(e) => setForm((prev) => ({ ...prev, mustUseEndCall: e.target.checked }))}
              />
              Require end_call tool
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.enableDynamicVariables}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enableDynamicVariables: e.target.checked }))
                }
              />
              Dynamic variables
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.includePostCallWebhook}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, includePostCallWebhook: e.target.checked }))
                }
              />
              Post-call webhook
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void generateConfig()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-arcana-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Prompt Export
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-arcana-border bg-arcana-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Ready-to-paste Prompt
            </h2>
            <button
              type="button"
              onClick={() => void copyOutput()}
              disabled={!textOutput}
              className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-1.5 text-xs text-slate-300 hover:border-arcana-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy Prompt"}
            </button>
          </div>

          {result?.generatedAt && (
            <p className="text-xs text-slate-500">
              Generated {new Date(result.generatedAt).toLocaleString()}
              {result.fallbackUsed ? " (fallback template used)" : ""}
            </p>
          )}

          <textarea
            readOnly
            value={textOutput}
            placeholder='Click "Generate Prompt Export" to create your custom template.'
            className="h-[640px] w-full rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
