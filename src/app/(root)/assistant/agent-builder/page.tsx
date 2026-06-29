"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Loader2, Sparkles } from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

type BuilderForm = {
  exportMode: "prompt" | "json";
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
  exportMode: "prompt",
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

const BUILDER_STORAGE_KEY = "arcana:assistant-agent-builder:v1";

export default function AssistantAgentBuilderPage() {
  const [form, setForm] = useState<BuilderForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [firstSentenceLoading, setFirstSentenceLoading] = useState(false);
  const [firstSentenceCopied, setFirstSentenceCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [firstSentence, setFirstSentence] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{
    exportMode: "prompt" | "json";
    exportText: string;
    generatedAt?: string;
    fallbackUsed?: boolean;
  } | null>(null);

  const textOutput = useMemo(() => {
    if (!result) return "";
    return result.exportText;
  }, [result]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BUILDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: BuilderForm;
        firstSentence?: string;
        savedAt?: string;
      };
      if (parsed.form) {
        setForm(parsed.form);
      }
      if (typeof parsed.firstSentence === "string") {
        setFirstSentence(parsed.firstSentence);
      }
      if (typeof parsed.savedAt === "string") {
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

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
          firstSentence,
          ...form,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        exportMode?: "prompt" | "json";
        exportText?: string;
        exportJson?: Record<string, unknown>;
        error?: string;
        generatedAt?: string;
        fallbackUsed?: boolean;
      };
      const resolvedMode = payload.exportMode === "json" ? "json" : "prompt";
      const resolvedText =
        resolvedMode === "json"
          ? payload.exportJson
            ? JSON.stringify(payload.exportJson, null, 2)
            : ""
          : payload.exportText ?? "";
      if (!response.ok || !resolvedText) {
        throw new Error(payload.error ?? "Failed to generate ElevenLabs prompt export.");
      }
      setResult({
        exportMode: resolvedMode,
        exportText: resolvedText,
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

  function saveDataPoints() {
    if (typeof window === "undefined") return;
    try {
      const nextSavedAt = new Date().toISOString();
      window.localStorage.setItem(
        BUILDER_STORAGE_KEY,
        JSON.stringify({
          form,
          firstSentence,
          savedAt: nextSavedAt,
        })
      );
      setSavedAt(nextSavedAt);
      setSaveNotice("Saved");
      window.setTimeout(() => setSaveNotice(null), 1600);
    } catch {
      setError("Unable to save data points on this browser.");
    }
  }

  async function generateFirstSentence() {
    setFirstSentenceLoading(true);
    setError(null);
    setFirstSentenceCopied(false);
    try {
      const response = await fetch("/api/ai/assistant/agent-builder/first-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: DEFAULT_WORKSPACE_ID,
          companyName: form.companyName,
          appName: form.appName,
          agentName: form.agentName,
          primaryAudience: form.primaryAudience,
          goals: form.goals,
          tone: form.tone,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        firstSentence?: string;
        error?: string;
      };
      if (!response.ok || !payload.firstSentence) {
        throw new Error(payload.error ?? "Failed to generate first sentence.");
      }
      setFirstSentence(payload.firstSentence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate first sentence.");
    } finally {
      setFirstSentenceLoading(false);
    }
  }

  async function copyFirstSentence() {
    if (!firstSentence) return;
    await navigator.clipboard.writeText(firstSentence);
    setFirstSentenceCopied(true);
    window.setTimeout(() => setFirstSentenceCopied(false), 1500);
  }

  function downloadOutput() {
    if (!textOutput) return;
    const mode = result?.exportMode ?? form.exportMode;
    const filename =
      mode === "json"
        ? `elevenlabs-agent-config-${new Date().toISOString().slice(0, 10)}.json`
        : `elevenlabs-agent-prompt-${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([textOutput], {
      type: mode === "json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 lg:space-y-6">
      <div className="rounded-2xl border border-arcana-border bg-arcana-surface/80 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">ElevenLabs Agent Builder</h1>
            <p className="mt-1 text-sm text-slate-400">
              Generate either a ready-to-paste prompt export or advanced JSON config for automation.
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
          <div className="rounded-xl border border-arcana-border bg-arcana-navy/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                First Sentence Generator
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generateFirstSentence()}
                  disabled={firstSentenceLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-2.5 py-1.5 text-xs text-slate-300 hover:border-arcana-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {firstSentenceLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate First Sentence
                </button>
                <button
                  type="button"
                  onClick={() => void copyFirstSentence()}
                  disabled={!firstSentence}
                  className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-2.5 py-1.5 text-xs text-slate-300 hover:border-arcana-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {firstSentenceCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <textarea
              value={firstSentence}
              onChange={(e) => setFirstSentence(e.target.value)}
              placeholder='Click "Generate First Sentence" to draft your opener.'
              rows={2}
              className="w-full rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            />
          </div>

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

          <div className="space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Export Mode
            </span>
            <div className="inline-flex rounded-lg border border-arcana-border bg-arcana-navy p-1">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, exportMode: "prompt" }))}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.exportMode === "prompt"
                    ? "bg-arcana-blue/20 text-arcana-blue"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Prompt Export
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, exportMode: "json" }))}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.exportMode === "json"
                    ? "bg-arcana-blue/20 text-arcana-blue"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Advanced JSON Export
              </button>
            </div>
          </div>

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDataPoints}
              className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-arcana-blue"
            >
              Save Data Points
            </button>
            <button
              type="button"
              onClick={() => void generateConfig()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-arcana-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {form.exportMode === "json" ? "Generate Advanced JSON Export" : "Generate Prompt Export"}
            </button>
            {(saveNotice || savedAt) && (
              <span className="text-xs text-slate-500">
                {saveNotice ?? `Saved ${new Date(savedAt as string).toLocaleString()}`}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-arcana-border bg-arcana-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              {result?.exportMode === "json" ? "Ready-to-paste JSON" : "Ready-to-paste Prompt"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadOutput}
                disabled={!textOutput}
                className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-1.5 text-xs text-slate-300 hover:border-arcana-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {result?.exportMode === "json" ? "Download .json" : "Download .txt"}
              </button>
              <button
                type="button"
                onClick={() => void copyOutput()}
                disabled={!textOutput}
                className="inline-flex items-center gap-2 rounded-lg border border-arcana-border bg-arcana-navy px-3 py-1.5 text-xs text-slate-300 hover:border-arcana-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied
                  ? "Copied"
                  : result?.exportMode === "json"
                  ? "Copy JSON"
                  : "Copy Prompt"}
              </button>
            </div>
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
            placeholder='Select export mode, then click generate.'
            className="h-[640px] w-full rounded-lg border border-arcana-border bg-arcana-navy px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
