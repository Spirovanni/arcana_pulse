"use client";

import { useState } from "react";
import {
  Landmark,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getBanksByWorkspace,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/services/workspace";
import { listTransactions } from "@/lib/services/transactions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

export default function MyBanksPage() {
  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function toggleExpand(bankId: string) {
    setExpandedBankId((prev) => (prev === bankId ? null : bankId));
  }

  function copyShareableId(shareableId: string) {
    navigator.clipboard.writeText(shareableId);
    setCopiedId(shareableId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getRecentBankTransactions(bankId: string) {
    return listTransactions(
      { workspaceId: DEFAULT_WORKSPACE_ID, bankId },
      { page: 1, pageSize: 5 }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Banks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your connected bank accounts
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          onClick={() =>
            alert(
              "Plaid bank linking coming soon — sandbox credentials configured."
            )
          }
        >
          <Plus className="w-4 h-4" />
          Connect Bank
        </button>
      </div>

      {banks.length === 0 ? (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-12 text-center">
          <Landmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No banks connected
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Connect your first bank account to see balances and transactions
          </p>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            onClick={() =>
              alert(
                "Plaid bank linking coming soon — sandbox credentials configured."
              )
            }
          >
            Connect Your First Bank
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => {
            const isExpanded = expandedBankId === bank.bankId;
            const isCopied = copiedId === bank.shareableId;

            return (
              <div
                key={bank.bankId}
                className="rounded-xl bg-arcana-surface border border-arcana-border"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-arcana-navy">
                        <Landmark className="w-5 h-5 text-arcana-sky" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {bank.institutionName}
                        </p>
                        <p className="text-xs text-slate-400">
                          ...{bank.displayMask}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-1">Balance</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(bank.balance)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyShareableId(bank.shareableId)}
                    className="flex items-center gap-2 text-xs text-slate-400 bg-arcana-navy rounded-lg px-3 py-2 w-full hover:bg-arcana-border transition-colors"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span className="font-mono">{bank.shareableId}</span>
                    {isCopied && (
                      <span className="ml-auto text-green-400 text-[10px]">
                        Copied!
                      </span>
                    )}
                  </button>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(bank.bankId)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium bg-arcana-navy text-slate-300 hover:bg-arcana-border transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          Hide Transactions
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          View Transactions
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-arcana-border px-5 py-4">
                    <p className="text-xs font-medium text-slate-400 mb-3">
                      Recent Transactions
                    </p>
                    {(() => {
                      const { items } = getRecentBankTransactions(bank.bankId);
                      if (items.length === 0) {
                        return (
                          <p className="text-xs text-slate-500 text-center py-4">
                            No transactions found for this account
                          </p>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          {items.map((txn) => (
                            <div
                              key={txn.transactionId}
                              className="flex items-center justify-between py-2 border-b border-arcana-border last:border-b-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white truncate">
                                  {txn.title}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {formatDate(txn.date)} &middot;{" "}
                                  {CATEGORY_LABELS[txn.category]}
                                </p>
                              </div>
                              <p
                                className={`text-sm font-medium ml-3 ${
                                  txn.transactionType === "income"
                                    ? "text-green-400"
                                    : txn.transactionType === "expense"
                                      ? "text-red-400"
                                      : "text-blue-400"
                                }`}
                              >
                                {txn.transactionType === "income" ? "+" : "-"}
                                {formatCurrency(txn.amount)}
                              </p>
                            </div>
                          ))}
                          <a
                            href={`/transactions?bank=${bank.bankId}`}
                            className="block text-center text-xs text-arcana-sky hover:text-blue-400 pt-2 transition-colors"
                          >
                            View all transactions &rarr;
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
