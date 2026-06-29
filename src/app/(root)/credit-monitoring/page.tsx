"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ShieldCheck, Upload, Sparkles, FileText } from "lucide-react";
import { notifyAiUsageUpdated } from "@/lib/aiUsageRefresh";

export default function CreditMonitoringPage() {
  const [reportText, setReportText] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentScore, setCurrentScore] = useState<string>("");
  const [targetScore, setTargetScore] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState("");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  async function handleFilePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setReportText(text);
    setFileName(file.name);
  }

  async function handleAnalyze() {
    setError("");
    setStrategy("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/credit-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportText,
          currentScore: currentScore ? Number(currentScore) : null,
          targetScore: targetScore ? Number(targetScore) : null,
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; strategy?: string; lastAnalyzedAt?: string }));
      if (!res.ok) throw new Error(data.error ?? "Failed to generate strategy");
      setStrategy(data.strategy ?? "");
      setLastAnalyzedAt(data.lastAnalyzedAt ?? new Date().toISOString());
      notifyAiUsageUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze report");
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = useMemo(() => reportText.trim().length >= 50 && !loading, [reportText, loading]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
            Credit Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload credit report text and generate an AI strategy to improve your score.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="rounded-lg border border-arcana-border bg-arcana-navy/40 px-4 py-3 text-sm text-slate-300 cursor-pointer hover:border-emerald-500/40 transition-colors">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-300" />
              Upload report (.txt/.csv/.pdf text layer)
            </span>
            <input
              type="file"
              accept=".txt,.csv,.pdf"
              onChange={handleFilePick}
              className="sr-only"
            />
          </label>
          <input
            type="number"
            min={300}
            max={850}
            value={currentScore}
            onChange={(e) => setCurrentScore(e.target.value)}
            placeholder="Current score (optional)"
            className="px-3 py-3 rounded-lg bg-arcana-navy/40 border border-arcana-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
          />
          <input
            type="number"
            min={300}
            max={850}
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder="Target score (optional)"
            className="px-3 py-3 rounded-lg bg-arcana-navy/40 border border-arcana-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
          />
        </div>

        {fileName && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Loaded file: {fileName}
          </p>
        )}

        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Paste credit report content here (accounts, utilization, payment history, inquiries, derogatory marks, etc.)"
          className="w-full h-48 px-3 py-3 rounded-lg bg-arcana-navy/30 border border-arcana-border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Educational analysis only. No credit bureau actions are performed automatically.
          </p>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Analyzing..." : "Generate Strategy"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {strategy && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-[1.4px]">AI Credit Strategy</h2>
            {lastAnalyzedAt && (
              <span className="text-xs text-slate-500">
                Last analysis: {new Date(lastAnalyzedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-arcana-border bg-arcana-navy/30 p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-200">{strategy}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
