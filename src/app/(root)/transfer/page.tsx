"use client";

import { SendHorizontal, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { getBanksByWorkspace, DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { TRANSFER_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { mockTransfers } from "@/lib/mock/data";

const statusIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  posted: CheckCircle,
  pending: Clock,
  processing: Clock,
  failed: AlertCircle,
};

export default function TransferPage() {
  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transfer Funds</h1>
        <p className="text-sm text-slate-400 mt-1">
          Move money between your linked accounts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            New Transfer
          </h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                From Account
              </label>
              <select
                aria-label="From Account"
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
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Recipient Arcana Transfer ID
              </label>
              <input
                type="text"
                placeholder="e.g. ARC-BOA-7231"
                className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
              />
              <p className="text-xs text-slate-500 mt-1">
                The recipient&apos;s unique Arcana Transfer ID shown on their
                bank card
              </p>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Recipient Email (optional)
              </label>
              <input
                type="email"
                placeholder="recipient@example.com"
                className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
              />
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
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Note
              </label>
              <textarea
                rows={2}
                placeholder="What is this transfer for?"
                className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <SendHorizontal className="w-4 h-4" />
              Send Transfer
            </button>
          </form>
        </div>

        {/* Transfer History */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            Recent Transfers
          </h3>
          {mockTransfers.length === 0 ? (
            <div className="text-center py-8">
              <SendHorizontal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockTransfers.map((xfr) => {
                const StatusIcon = statusIcon[xfr.status] || Clock;
                const senderBank = banks.find(
                  (b) => b.bankId === xfr.senderBankId
                );
                return (
                  <div
                    key={xfr.transferId}
                    className="flex items-start justify-between p-4 rounded-lg bg-arcana-navy"
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon
                        className={`w-5 h-5 mt-0.5 ${
                          xfr.status === "posted"
                            ? "text-arcana-success"
                            : xfr.status === "failed"
                            ? "text-arcana-danger"
                            : "text-arcana-warning"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-white font-medium">
                          {senderBank?.institutionName || "Unknown"} &rarr;{" "}
                          {xfr.receiverShareableId}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {xfr.note}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(xfr.createdAt).toLocaleDateString()} &middot;{" "}
                          {TRANSFER_STATUS_LABELS[xfr.status]}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(xfr.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
