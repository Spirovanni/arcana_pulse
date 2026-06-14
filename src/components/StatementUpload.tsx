"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

interface StatementUploadProps {
  bankId: string;
  bankName: string;
  onClose: () => void;
  onSuccess: (imported: number) => void;
}

interface UploadResult {
  imported: number;
  duplicates: number;
  skipped: number;
  total: number;
  format: string;
  message: string;
  warning?: string;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

const ACCEPTED = ".csv,.txt,.pdf";
const MAX_MB = 10;

function FileIcon({ name }: { name: string }) {
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return <FileSpreadsheet className="w-8 h-8 text-arcana-success" />;
  }
  return <FileText className="w-8 h-8 text-primary" />;
}

export default function StatementUpload({
  bankId,
  bankName,
  onClose,
  onSuccess,
}: StatementUploadProps) {
  const [state, setUploadState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`File is too large. Maximum size is ${MAX_MB} MB.`);
      setUploadState("error");
      return;
    }
    setFile(f);
    setUploadState("idle");
    setErrorMsg("");
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setUploadState("idle");
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState("uploading");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bankId", bankId);

      const res = await fetch("/api/banks/statements", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Upload failed. Please try again.");
        setUploadState("error");
        return;
      }

      setResult(data);
      setUploadState("success");
      if (data.imported > 0) onSuccess(data.imported);
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setUploadState("error");
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setErrorMsg("");
    setUploadState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-container rounded-sm border border-outline/30 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/20">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[2px] text-on-surface">
              Upload Statement
            </h2>
            <p className="text-[11px] text-secondary mt-0.5">{bankName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-on-surface transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Success state */}
          {state === "success" && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-sm bg-arcana-success/10 border border-arcana-success/30">
                <CheckCircle className="w-5 h-5 text-arcana-success flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-arcana-success">{result.message}</p>
                  {result.warning && (
                    <p className="text-[11px] text-secondary mt-1">{result.warning}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Imported", value: result.imported, color: "text-arcana-success" },
                  { label: "Duplicates", value: result.duplicates, color: "text-secondary" },
                  { label: "Skipped", value: result.skipped, color: "text-secondary" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 rounded-sm border border-outline/20 bg-surface-container-high">
                    <p className={`text-xl font-light ${color}`}>{value}</p>
                    <p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[2px] border border-outline/40 text-secondary hover:text-primary hover:border-primary/40 transition-colors rounded-sm"
                >
                  Upload Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-metallic py-2.5 text-[11px] font-bold uppercase tracking-[2px]"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Upload UI */}
          {state !== "success" && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setUploadState("dragging"); }}
                onDragLeave={() => setUploadState("idle")}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-sm border-2 border-dashed cursor-pointer transition-all ${
                  state === "dragging"
                    ? "border-primary/60 bg-primary/5"
                    : file
                    ? "border-arcana-success/40 bg-arcana-success/5"
                    : "border-outline/30 hover:border-primary/40 hover:bg-primary/3"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={handleInputChange}
                  className="hidden"
                />

                {file ? (
                  <>
                    <FileIcon name={file.name} />
                    <div className="text-center">
                      <p className="text-xs font-bold text-on-surface truncate max-w-[280px]">{file.name}</p>
                      <p className="text-[11px] text-secondary mt-0.5">
                        {(file.size / 1024).toFixed(0)} KB · Click to change
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-secondary" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-on-surface">
                        {state === "dragging" ? "Drop it here" : "Drop your statement here"}
                      </p>
                      <p className="text-[11px] text-secondary mt-1">
                        CSV or PDF · up to {MAX_MB} MB
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[2px] text-primary font-bold border border-primary/30 px-3 py-1 rounded-sm">
                      Browse Files
                    </span>
                  </>
                )}
              </div>

              {/* Error */}
              {state === "error" && errorMsg && (
                <div className="flex items-start gap-2.5 p-3 rounded-sm bg-arcana-error/10 border border-arcana-error/30">
                  <AlertCircle className="w-4 h-4 text-arcana-error flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-arcana-error leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* Tips */}
              <div className="text-[11px] text-secondary space-y-1.5 px-1">
                <p className="font-bold text-on-surface/60 uppercase tracking-wider text-[10px] mb-2">Tips</p>
                <p>— Export a <strong className="text-on-surface">CSV</strong> directly from your bank&#39;s website for best results.</p>
                <p>— Text-based PDFs work too — scanned image PDFs won&#39;t.</p>
                <p>— Duplicate transactions are automatically skipped.</p>
                <p>— Supports Chase, Bank of America, Wells Fargo, Citi, and most major banks.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[2px] border border-outline/40 text-secondary hover:text-primary hover:border-primary/40 transition-colors rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || state === "uploading"}
                  className="flex-1 btn-metallic py-2.5 text-[11px] font-bold uppercase tracking-[2px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state === "uploading" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Import Statement
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
