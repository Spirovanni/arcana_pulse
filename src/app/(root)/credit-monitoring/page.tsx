"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  LineChart,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { notifyAiUsageUpdated } from "@/lib/aiUsageRefresh";
import type { CreditReport } from "@/lib/types";

export default function CreditMonitoringPage() {
  const [reports, setReports] = useState<CreditReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportText, setReportText] = useState("");
  const [fileName, setFileName] = useState("");
  const [reportTitle, setReportTitle] = useState("Credit Report");
  const [currentScore, setCurrentScore] = useState<string>("");
  const [targetScore, setTargetScore] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState("");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueDate, setReminderDueDate] = useState("");
  const [timelineScore, setTimelineScore] = useState("");

  const selectedReport = useMemo(
    () => reports.find((report) => report.reportId === selectedReportId) ?? null,
    [reports, selectedReportId]
  );

  async function loadReports() {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/credit-monitoring");
      const data = await res.json().catch(() => ({} as { reports?: CreditReport[] }));
      const nextReports = data.reports ?? [];
      setReports(nextReports);
      if (!selectedReportId && nextReports.length > 0) {
        setSelectedReportId(nextReports[0].reportId);
      }
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  function openReport(report: CreditReport) {
    setSelectedReportId(report.reportId);
    setReportText(report.reportText);
    setReportTitle(report.title);
    setCurrentScore(
      typeof report.currentScore === "number" ? String(report.currentScore) : ""
    );
    setTargetScore(
      typeof report.targetScore === "number" ? String(report.targetScore) : ""
    );
    const latestRevision =
      report.strategyRevisions[report.strategyRevisions.length - 1];
    setStrategy(latestRevision?.strategy ?? "");
    setLastAnalyzedAt(report.lastAnalyzedAt ?? null);
  }

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
      const res = await fetch("/api/credit-monitoring/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReportId,
          title: reportTitle,
          reportText,
          currentScore: currentScore ? Number(currentScore) : null,
          targetScore: targetScore ? Number(targetScore) : null,
        }),
      });
      const data = await res.json().catch(
        () => ({} as { error?: string; strategy?: string; lastAnalyzedAt?: string; report?: CreditReport })
      );
      if (!res.ok) throw new Error(data.error ?? "Failed to generate strategy");
      setStrategy(data.strategy ?? "");
      setLastAnalyzedAt(data.lastAnalyzedAt ?? new Date().toISOString());
      if (data.report) {
        setSelectedReportId(data.report.reportId);
      }
      await loadReports();
      notifyAiUsageUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze report");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddReminder() {
    if (!selectedReport || !reminderTitle || !reminderDueDate) return;
    const res = await fetch(`/api/credit-monitoring/${selectedReport.reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_reminder",
        title: reminderTitle,
        dueDate: reminderDueDate,
      }),
    });
    if (res.ok) {
      setReminderTitle("");
      setReminderDueDate("");
      await loadReports();
    }
  }

  async function toggleReminder(reminderId: string, completed: boolean) {
    if (!selectedReport) return;
    await fetch(`/api/credit-monitoring/${selectedReport.reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_reminder",
        reminderId,
        completed,
      }),
    });
    await loadReports();
  }

  async function handleAddTimeline() {
    if (!selectedReport || !timelineScore) return;
    const score = Number(timelineScore);
    if (!Number.isFinite(score)) return;
    await fetch(`/api/credit-monitoring/${selectedReport.reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_timeline",
        score,
      }),
    });
    setTimelineScore("");
    await loadReports();
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
        <input
          type="text"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          placeholder="Report title"
          className="w-full px-3 py-3 rounded-lg bg-arcana-navy/40 border border-arcana-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
        />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[1.4px] text-slate-400 font-semibold">
            Saved Reports
          </p>
          {loadingReports ? (
            <p className="text-xs text-slate-500">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-slate-500">No reports saved yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.reportId}
                  type="button"
                  onClick={() => openReport(report)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                    selectedReportId === report.reportId
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-arcana-border bg-arcana-navy/20 hover:border-emerald-500/30"
                  }`}
                >
                  <p className="text-sm text-white font-medium truncate">{report.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {report.strategyRevisions.length} revision(s)
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[1.4px] text-slate-400 font-semibold flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Reminders
          </p>
          {selectedReport?.reminders?.map((reminder) => (
            <div key={reminder.reminderId} className="rounded-lg border border-arcana-border bg-arcana-navy/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{reminder.title}</p>
                  <p className="text-[11px] text-slate-500">Due {new Date(reminder.dueDate).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReminder(reminder.reminderId, !reminder.completed)}
                  className={`text-[11px] px-2 py-1 rounded ${
                    reminder.completed ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {reminder.completed ? "Done" : "Mark Done"}
                </button>
              </div>
            </div>
          ))}
          <div className="space-y-2 pt-2 border-t border-arcana-border">
            <input
              type="text"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              placeholder="Reminder title"
              className="w-full px-3 py-2 rounded-lg bg-arcana-navy/30 border border-arcana-border text-sm text-white"
            />
            <input
              type="date"
              value={reminderDueDate}
              onChange={(e) => setReminderDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-arcana-navy/30 border border-arcana-border text-sm text-white"
            />
            <button
              type="button"
              onClick={handleAddReminder}
              disabled={!selectedReport}
              className="w-full rounded-lg bg-emerald-600/80 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Add Reminder
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[1.4px] text-slate-400 font-semibold flex items-center gap-1">
            <LineChart className="w-3 h-3" />
            Trend Timeline
          </p>
          {selectedReport?.timeline?.map((entry) => (
            <div key={entry.entryId} className="rounded-lg border border-arcana-border bg-arcana-navy/20 px-3 py-2">
              <p className="text-sm text-white">Score: {entry.score}</p>
              <p className="text-[11px] text-slate-500">
                {new Date(entry.recordedAt).toLocaleString()}
              </p>
            </div>
          ))}
          <div className="space-y-2 pt-2 border-t border-arcana-border">
            <input
              type="number"
              min={300}
              max={850}
              value={timelineScore}
              onChange={(e) => setTimelineScore(e.target.value)}
              placeholder="Add score point"
              className="w-full px-3 py-2 rounded-lg bg-arcana-navy/30 border border-arcana-border text-sm text-white"
            />
            <button
              type="button"
              onClick={handleAddTimeline}
              disabled={!selectedReport}
              className="w-full rounded-lg bg-cyan-600/80 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Add Timeline Entry
            </button>
          </div>
        </div>
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
          {selectedReport && selectedReport.strategyRevisions.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-arcana-border">
              <p className="text-xs uppercase tracking-[1.4px] text-slate-400 font-semibold">
                Strategy Revisions
              </p>
              {selectedReport.strategyRevisions
                .slice()
                .reverse()
                .map((revision) => (
                  <div key={revision.revisionId} className="rounded-lg border border-arcana-border bg-arcana-navy/20 px-3 py-2">
                    <p className="text-xs text-slate-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                      {new Date(revision.createdAt).toLocaleString()} · {revision.sourceChars} chars analyzed
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
