"use client";

/**
 * UploadBankModal
 *
 * Lets the user upload a bank statement PDF (for reference) and a CSV file
 * (for transaction parsing). After upload it calls /api/banks/build-from-statement
 * which uses Gemini AI to categorise every transaction, then creates a new bank
 * account that appears in the Statement-Linked Banks section of My Banks.
 */

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import {
  X,
  FileText,
  FileScan,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";

export interface BuildResult {
  bank: {
    bankId: string;
    institutionName: string;
    displayMask: string;
    balance?: number;
  };
  imported: number;
  duplicates: number;
  periodStart: string;
  periodEnd: string;
  message: string;
  username: string;
  filename: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (result: BuildResult) => void;
}

type Step = "upload" | "processing" | "done" | "error";

const MAX_CSV_BYTES  = 10 * 1024 * 1024;  // 10 MB
const MAX_PDF_BYTES  = 25 * 1024 * 1024;  // 25 MB

function FileDropZone({
  label,
  accept,
  icon: Icon,
  file,
  onFile,
  hint,
  required,
}: {
  label: string;
  accept: string;
  icon: React.ComponentType<{ className?: string }>;
  file: File | null;
  onFile: (f: File) => void;
  hint: string;
  required?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          file
            ? "border-arcana-blue bg-arcana-blue/5"
            : dragging
            ? "border-arcana-sky bg-arcana-sky/10 scale-[1.01]"
            : "border-arcana-border hover:border-arcana-sky/50 hover:bg-arcana-navy/30"
        }`}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {file ? (
          <>
            <Icon className="w-6 h-6 text-arcana-sky" />
            <span className="text-xs font-medium text-white text-center px-4 truncate max-w-full">
              {file.name}
            </span>
            <span className="text-[10px] text-slate-500">
              {(file.size / 1024).toFixed(0)} KB — click to replace
            </span>
          </>
        ) : (
          <>
            <Icon className="w-6 h-6 text-slate-500" />
            <span className="text-xs text-slate-400 text-center px-4">{hint}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function UploadBankModal({ onClose, onSuccess }: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [accountMask, setAccountMask] = useState("");
  const [step, setStep] = useState<Step>("upload");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);

  // Auto-fill institution / mask from CSV filename
  const handleCsvFile = useCallback((f: File) => {
    setCsvFile(f);
    const base = f.name.replace(/\.[^.]+$/, "");
    const maskMatch = base.match(/(\d{4,6})/);
    if (maskMatch && !accountMask) setAccountMask(maskMatch[1].slice(-4));

    const institutions: [RegExp, string][] = [
      [/^chase/i,       "Chase"],
      [/^bofa|^boa|^bank.?of.?america/i, "Bank of America"],
      [/^wells.?fargo|^wf/i, "Wells Fargo"],
      [/^citi/i,        "Citi"],
      [/^usaa/i,        "USAA"],
      [/^navy.?fed/i,   "Navy Federal"],
      [/^pnc/i,         "PNC Bank"],
      [/^us.?bank/i,    "U.S. Bank"],
      [/^cap.?one|^capital.?one/i, "Capital One"],
      [/^amex|^american.?express/i, "American Express"],
      [/^discover/i,    "Discover"],
    ];
    if (!institutionName) {
      for (const [re, name] of institutions) {
        if (re.test(base)) { setInstitutionName(name); break; }
      }
    }
  }, [accountMask, institutionName]);

  async function handleSubmit() {
    if (!csvFile) return;
    setError(null);

    // Client-side validation
    if (csvFile.size > MAX_CSV_BYTES) {
      setError("CSV file exceeds the 10 MB limit.");
      return;
    }
    if (pdfFile && pdfFile.size > MAX_PDF_BYTES) {
      setError("PDF file exceeds the 25 MB limit.");
      return;
    }

    setStep("processing");

    try {
      // ── Step 1: Read CSV content in the browser ──────────────────────────
      // We send the raw text to the API so no server-side file writes are
      // needed — this works on Vercel's read-only filesystem.
      setStatusMessage("Reading statement file…");
      const csvContent = await csvFile.text();

      if (!csvContent.trim()) {
        throw new Error("The CSV file appears to be empty.");
      }

      // ── Step 2: AI categorisation + bank creation ────────────────────────
      setStatusMessage("Sending transactions to AI for categorisation… (this may take 15–30 seconds)");

      const buildRes = await fetch("/api/banks/build-from-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,                             // inline — no filesystem dependency
          filename: csvFile.name,                 // used for institution/mask hints
          institutionName: institutionName || undefined,
          accountMask: accountMask || undefined,
          // omit workspaceId — the API derives it from the authenticated session
        }),
      });

      if (!buildRes.ok) {
        const err = await buildRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Server error ${buildRes.status}`);
      }

      const data = await buildRes.json() as BuildResult;
      setResult(data);
      setStep("done");
      onSuccess(data);

    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
      setStep("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-arcana-surface border border-arcana-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arcana-border">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-arcana-sky" />
              Upload Bank Statement
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              We&#8217;ll create a new bank account and AI-categorise every transaction
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* ── Upload step ─────────────────────────────────────────────── */}
          {(step === "upload" || step === "error") && (
            <>
              {/* AI badge */}
              <div className="flex items-start gap-2.5 rounded-xl bg-violet-950/40 border border-violet-700/30 px-4 py-3">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-violet-300">
                  Gemini AI will categorise every transaction into Food, Transport, Housing, etc.
                  giving you instant spending insights on your real bank data.
                </p>
              </div>

              {/* File drop zones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileDropZone
                  label="CSV Statement"
                  accept=".csv,text/csv"
                  icon={FileText}
                  file={csvFile}
                  onFile={handleCsvFile}
                  hint="Drag & drop or click to upload .CSV from your bank"
                  required
                />
                <FileDropZone
                  label="PDF Statement (optional)"
                  accept=".pdf,application/pdf"
                  icon={FileScan}
                  file={pdfFile}
                  onFile={setPdfFile}
                  hint="Upload the PDF for reference and printing"
                />
              </div>

              {/* Optional overrides */}
              {csvFile && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Bank Name</label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Auto-detected"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Account (last 4)</label>
                    <input
                      type="text"
                      value={accountMask}
                      maxLength={4}
                      onChange={(e) => setAccountMask(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="e.g. 8016"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-arcana-navy border border-arcana-border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                    />
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Supported banks: Chase, Bank of America, Wells Fargo, Citi, USAA, Navy Federal,
                  Capital One, Discover, and any bank that exports a standard CSV.
                </span>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/40 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ── Processing step ──────────────────────────────────────────── */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-violet-900/30 border border-violet-600/30 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-violet-400" />
                </div>
                <Loader2 className="w-6 h-6 text-arcana-sky animate-spin absolute -top-1 -right-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Building your bank…</p>
                <p className="text-xs text-slate-400 max-w-xs">{statusMessage}</p>
              </div>
              {/* Progress steps */}
              <div className="w-full space-y-2 text-left bg-arcana-navy/50 rounded-xl px-4 py-3">
                {[
                  { label: "Read CSV file", done: true },
                  { label: "Parse transactions from CSV", done: statusMessage.includes("AI") },
                  { label: "AI categorisation with Gemini Flash", done: false },
                  { label: "Create bank account + import", done: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {s.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                    )}
                    <span className={`text-xs ${s.done ? "text-green-400" : "text-slate-500"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Done step ───────────────────────────────────────────────── */}
          {step === "done" && result && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-600/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {result.bank.institutionName} ···{result.bank.displayMask} Created
                </p>
                <p className="text-sm text-slate-400 mt-1">{result.message}</p>
              </div>
              <div className="w-full grid grid-cols-3 gap-3 text-center bg-arcana-navy/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-lg font-bold text-white">{result.imported.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">Transactions</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{result.periodStart}</p>
                  <p className="text-[10px] text-slate-500">Period start</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{result.periodEnd}</p>
                  <p className="text-[10px] text-slate-500">Period end</p>
                </div>
              </div>
              <a
                href={`/statement-viewer/${encodeURIComponent(result.username)}/${encodeURIComponent(result.filename)}`}
                className="flex items-center gap-1.5 text-sm text-arcana-sky hover:underline"
              >
                View full statement <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-arcana-border bg-arcana-navy/40 flex items-center justify-end gap-3">
          {step === "done" ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          ) : step === "processing" ? (
            <p className="text-xs text-slate-500">Please wait — do not close this window</p>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!csvFile}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-arcana-blue text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Build Bank with AI
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
