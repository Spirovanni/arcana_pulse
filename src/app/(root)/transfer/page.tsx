"use client";

import { useState, useCallback, useEffect } from "react";
import {
  SendHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCw,
  XCircle,
} from "lucide-react";
import {
  getBanksByWorkspace,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/services/workspace";
import {
  createTransfer,
  getTransfersByWorkspace,
} from "@/lib/services/transfers";
import { TRANSFER_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Transfer, TransferStatus } from "@/lib/types";

// ─── Status config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TransferStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    border: string;
  }
> = {
  initiated: {
    icon: Clock,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
  },
  pending: {
    icon: Clock,
    color: "text-arcana-warning",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  processing: {
    icon: RotateCw,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  posted: {
    icon: CheckCircle,
    color: "text-arcana-success",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  failed: {
    icon: XCircle,
    color: "text-arcana-danger",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  reversed: {
    icon: AlertCircle,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
};

// The standard lifecycle path
const LIFECYCLE_STEPS: TransferStatus[] = [
  "initiated",
  "pending",
  "processing",
  "posted",
];

function getStepState(
  step: TransferStatus,
  currentStatus: TransferStatus
): "complete" | "current" | "upcoming" | "failed" {
  if (currentStatus === "failed" || currentStatus === "reversed") {
    const currentIdx = LIFECYCLE_STEPS.indexOf(step);
    // For failed/reversed, show which step it was at
    // We don't know exactly when it failed, so mark all as complete up to where it got
    if (currentStatus === "failed") {
      // The last step before failure — treat the step as the failure point
      return currentIdx === 0 ? "failed" : "upcoming";
    }
    if (currentStatus === "reversed") {
      // Reversed means it was posted, so all lifecycle steps are complete
      return "complete";
    }
  }
  const stepIdx = LIFECYCLE_STEPS.indexOf(step);
  const currentIdx = LIFECYCLE_STEPS.indexOf(currentStatus);
  if (stepIdx < currentIdx) return "complete";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}

// ─── Form types ─────────────────────────────────────────────────────

interface TransferFormData {
  senderBankId: string;
  receiverShareableId: string;
  recipientEmail: string;
  amount: string;
  note: string;
}

const emptyForm: TransferFormData = {
  senderBankId: "",
  receiverShareableId: "",
  recipientEmail: "",
  amount: "",
  note: "",
};

// ─── Component ──────────────────────────────────────────────────────

export default function TransferPage() {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version;

  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);
  const transfers = getTransfersByWorkspace(DEFAULT_WORKSPACE_ID);

  const [form, setForm] = useState<TransferFormData>(emptyForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof TransferFormData, string>>
  >({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Transfer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Auto-refresh every 10s to pick up status changes
  useEffect(() => {
    const interval = setInterval(() => bump(), 10_000);
    return () => clearInterval(interval);
  }, [bump]);

  async function pollDwollaStatus(transferId: string) {
    setPollingId(transferId);
    try {
      await fetch(`/api/dwolla/transfer?transferId=${transferId}`);
      bump();
    } catch {
      // Polling failed silently
    } finally {
      setPollingId(null);
    }
  }

  function updateField(field: keyof TransferFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof TransferFormData, string>> = {};

    if (!form.senderBankId) errs.senderBankId = "Select a source account";
    if (!form.receiverShareableId.trim()) {
      errs.receiverShareableId = "Enter a recipient Arcana Transfer ID";
    } else if (
      !/^ARC-[A-Z0-9]+-\d{4}$/.test(form.receiverShareableId.trim())
    ) {
      errs.receiverShareableId = "Format: ARC-XXXXX-0000";
    }
    if (
      form.recipientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail)
    ) {
      errs.recipientEmail = "Enter a valid email address";
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      errs.amount = "Enter an amount greater than $0.00";
    } else {
      const senderBank = banks.find((b) => b.bankId === form.senderBankId);
      if (senderBank && amt > senderBank.balance) {
        errs.amount = "Amount exceeds account balance";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      setConfirming(true);
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);

    const selectedBank = banks.find((b) => b.bankId === form.senderBankId);
    const useDwolla = !!selectedBank?.fundingSourceUrl;

    try {
      if (useDwolla) {
        // Route through Dwolla API for Plaid-linked banks with funding sources
        const res = await fetch("/api/dwolla/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: DEFAULT_WORKSPACE_ID,
            senderBankId: form.senderBankId,
            receiverShareableId: form.receiverShareableId.trim(),
            recipientEmail: form.recipientEmail || undefined,
            amount: parseFloat(form.amount),
            note: form.note,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Dwolla transfer failed");
        }
        setReceipt(data.transfer);
      } else {
        // Local service for mock / non-Dwolla banks
        const transfer = createTransfer({
          workspaceId: DEFAULT_WORKSPACE_ID,
          senderBankId: form.senderBankId,
          receiverShareableId: form.receiverShareableId.trim(),
          recipientEmail: form.recipientEmail || undefined,
          amount: parseFloat(form.amount),
          note: form.note,
        });
        setReceipt(transfer);
      }
      setForm(emptyForm);
      setConfirming(false);
      bump();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transfer failed";
      setSubmitError(message);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  function startNewTransfer() {
    setReceipt(null);
    setForm(emptyForm);
    setErrors({});
    setSubmitError(null);
  }

  const senderBank = banks.find((b) => b.bankId === form.senderBankId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transfer Funds</h1>
        <p className="text-sm text-slate-400 mt-1">
          Move money between your linked accounts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form / Receipt */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
          {receipt ? (
            /* ── Success Receipt ── */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Transfer Submitted
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your transfer is being processed
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Transfer ID</span>
                  <span className="text-white font-mono text-xs">
                    {receipt.transferId}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">From</span>
                  <span className="text-white font-medium">
                    {banks.find((b) => b.bankId === receipt.senderBankId)
                      ?.institutionName || "Unknown"}{" "}
                    (...
                    {banks.find((b) => b.bankId === receipt.senderBankId)
                      ?.displayMask || "????"}
                    )
                  </span>
                </div>
                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">To</span>
                  <span className="text-white font-medium font-mono">
                    {receipt.receiverShareableId}
                  </span>
                </div>
                {receipt.recipientEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Email</span>
                    <span className="text-white">
                      {receipt.recipientEmail}
                    </span>
                  </div>
                )}
                <div className="border-t border-arcana-border my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(receipt.amount)}
                  </span>
                </div>
                {receipt.note && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Note</span>
                    <span className="text-white text-right max-w-[200px]">
                      {receipt.note}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Status</span>
                  <StatusBadge status={receipt.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Date</span>
                  <span className="text-white">
                    {new Date(receipt.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Lifecycle tracker in receipt */}
              <div className="mb-6">
                <LifecycleTracker status={receipt.status} />
              </div>

              <button
                type="button"
                onClick={startNewTransfer}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <SendHorizontal className="w-4 h-4" />
                New Transfer
              </button>
            </div>
          ) : (
            /* ── Transfer Form ── */
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">
                New Transfer
              </h3>

              {submitError && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-arcana-danger shrink-0" />
                  <p className="text-xs text-arcana-danger">{submitError}</p>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleReview}>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    From Account
                  </label>
                  <select
                    aria-label="From Account"
                    value={form.senderBankId}
                    onChange={(e) =>
                      updateField("senderBankId", e.target.value)
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                  >
                    <option value="">Select source account</option>
                    {banks.map((bank) => (
                      <option key={bank.bankId} value={bank.bankId}>
                        {bank.institutionName} (...{bank.displayMask}) -{" "}
                        {formatCurrency(bank.balance)}
                      </option>
                    ))}
                  </select>
                  {errors.senderBankId && (
                    <p className="text-xs text-arcana-danger mt-1">
                      {errors.senderBankId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Recipient Arcana Transfer ID
                  </label>
                  <input
                    type="text"
                    value={form.receiverShareableId}
                    onChange={(e) =>
                      updateField(
                        "receiverShareableId",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="e.g. ARC-BOA-7231"
                    className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                  />
                  {errors.receiverShareableId ? (
                    <p className="text-xs text-arcana-danger mt-1">
                      {errors.receiverShareableId}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      The recipient&apos;s unique Arcana Transfer ID shown on
                      their bank card
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Recipient Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.recipientEmail}
                    onChange={(e) =>
                      updateField("recipientEmail", e.target.value)
                    }
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                  />
                  {errors.recipientEmail && (
                    <p className="text-xs text-arcana-danger mt-1">
                      {errors.recipientEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => updateField("amount", e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-arcana-danger mt-1">
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Note
                  </label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => updateField("note", e.target.value)}
                    placeholder="What is this transfer for?"
                    className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  <SendHorizontal className="w-4 h-4" />
                  Review Transfer
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Transfer History */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            Recent Transfers
          </h3>
          {transfers.length === 0 ? (
            <div className="text-center py-8">
              <SendHorizontal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((xfr) => {
                const config = STATUS_CONFIG[xfr.status];
                const StatusIcon = config.icon;
                const xfrSenderBank = banks.find(
                  (b) => b.bankId === xfr.senderBankId
                );
                const isExpanded = expandedId === xfr.transferId;

                return (
                  <div
                    key={xfr.transferId}
                    className="rounded-lg bg-arcana-navy overflow-hidden"
                  >
                    {/* Row summary */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : xfr.transferId)
                      }
                      className="w-full flex items-start justify-between p-4 text-left hover:bg-arcana-border/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <StatusIcon
                          className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">
                            {xfrSenderBank?.institutionName || "Unknown"}{" "}
                            &rarr; {xfr.receiverShareableId}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={xfr.status} />
                            <span className="text-[10px] text-slate-500">
                              {new Date(xfr.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(xfr.amount)}
                        </p>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-arcana-border px-4 py-4 space-y-4">
                        {/* Transfer details */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Transfer ID</span>
                            <span className="text-slate-300 font-mono">
                              {xfr.transferId}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">From</span>
                            <span className="text-slate-300">
                              {xfrSenderBank?.institutionName || "Unknown"} (...
                              {xfrSenderBank?.displayMask || "????"})
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">To</span>
                            <span className="text-slate-300 font-mono">
                              {xfr.receiverShareableId}
                            </span>
                          </div>
                          {xfr.recipientEmail && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Email</span>
                              <span className="text-slate-300">
                                {xfr.recipientEmail}
                              </span>
                            </div>
                          )}
                          {xfr.note && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Note</span>
                              <span className="text-slate-300 text-right max-w-[180px]">
                                {xfr.note}
                              </span>
                            </div>
                          )}
                          {xfr.providerReference && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">
                                Provider Ref
                              </span>
                              <span className="text-slate-300 font-mono">
                                {xfr.providerReference}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Updated</span>
                            <span className="text-slate-300">
                              {new Date(xfr.updatedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Lifecycle tracker */}
                        <LifecycleTracker status={xfr.status} />

                        {/* Poll Dwolla status + link to transactions */}
                        <div className="flex items-center justify-between pt-1">
                          {xfr.providerReference &&
                            xfr.status !== "posted" &&
                            xfr.status !== "failed" &&
                            xfr.status !== "reversed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  pollDwollaStatus(xfr.transferId)
                                }
                                disabled={pollingId === xfr.transferId}
                                className="text-xs text-arcana-sky hover:text-blue-400 transition-colors disabled:opacity-50"
                              >
                                {pollingId === xfr.transferId
                                  ? "Checking..."
                                  : "Check Status"}
                              </button>
                            )}
                          <a
                            href="/transactions?type=transfer"
                            className="text-xs text-arcana-sky hover:text-blue-400 transition-colors ml-auto"
                          >
                            View transactions &rarr;
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl bg-arcana-surface border border-arcana-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                Confirm Transfer
              </h3>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                title="Close"
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">From</span>
                <span className="text-white font-medium">
                  {senderBank?.institutionName} (...
                  {senderBank?.displayMask})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">To</span>
                <span className="text-white font-medium font-mono">
                  {form.receiverShareableId}
                </span>
              </div>
              {form.recipientEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white">{form.recipientEmail}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="text-white font-bold text-lg">
                  {formatCurrency(parseFloat(form.amount))}
                </span>
              </div>
              {form.note && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Note</span>
                  <span className="text-white text-right max-w-[200px]">
                    {form.note}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-lg bg-arcana-navy text-slate-300 text-sm font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizontal className="w-4 h-4" />
                )}
                {submitting ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransferStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color} ${config.bg} ${config.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "processing" ? "animate-pulse" : ""
        } ${config.color.replace("text-", "bg-")}`}
      />
      {TRANSFER_STATUS_LABELS[status]}
    </span>
  );
}

function LifecycleTracker({ status }: { status: TransferStatus }) {
  const isFailed = status === "failed";
  const isReversed = status === "reversed";

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
        Transfer Lifecycle
      </p>
      <div className="flex items-center gap-1">
        {LIFECYCLE_STEPS.map((step, i) => {
          const state = getStepState(step, status);
          return (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              {/* Step dot + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    state === "complete"
                      ? "bg-green-400 border-green-400"
                      : state === "current"
                        ? "bg-arcana-blue border-arcana-blue"
                        : state === "failed"
                          ? "bg-red-400 border-red-400"
                          : "bg-transparent border-slate-600"
                  }`}
                />
                <span
                  className={`text-[9px] mt-1 ${
                    state === "complete" || state === "current"
                      ? "text-slate-300"
                      : "text-slate-600"
                  }`}
                >
                  {TRANSFER_STATUS_LABELS[step]}
                </span>
              </div>
              {/* Connector line */}
              {i < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    state === "complete" ? "bg-green-400/50" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Terminal status indicator */}
      {(isFailed || isReversed) && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isFailed ? "bg-red-400" : "bg-orange-400"
            }`}
          />
          <span
            className={`text-[10px] font-medium ${
              isFailed ? "text-red-400" : "text-orange-400"
            }`}
          >
            {isFailed ? "Transfer Failed" : "Transfer Reversed"}
          </span>
        </div>
      )}
    </div>
  );
}
