"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Landmark,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
} from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import EmptyState from "@/components/EmptyState";
import StatementUpload from "@/components/StatementUpload";
import {
  getBanksByWorkspace,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/services/workspace";
import { listTransactions } from "@/lib/services/transactions";
import {
  getInvestmentAccountsByWorkspace,
  getHoldingsByAccount,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/services/investments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

export default function MyBanksPage() {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version;
  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);

  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [uploadingBank, setUploadingBank] = useState<{ bankId: string; bankName: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [syncingBankId, setSyncingBankId] = useState<string | null>(null);

  // Fetch a Plaid link token on mount
  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const res = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        });
        const data = await res.json();
        if (data.linkToken) {
          setLinkToken(data.linkToken);
        }
      } catch {
        // Link token fetch failed — button will show disabled state
      }
    }
    fetchLinkToken();
  }, []);

  // Plaid Link success handler
  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLinking(true);
      try {
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            workspaceId: DEFAULT_WORKSPACE_ID,
          }),
        });
        const data = await res.json();
        if (data.banks) {
          bump();
        }
      } catch {
        // Exchange failed
      } finally {
        setLinking(false);
      }
    },
    [bump]
  );

  const { open: openPlaidLink, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

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

  async function syncTransactions(bankId: string) {
    setSyncingBankId(bankId);
    try {
      await fetch("/api/plaid/sync-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId }),
      });
      bump();
    } catch {
      // Sync failed silently
    } finally {
      setSyncingBankId(null);
    }
  }

  const canConnect = plaidReady && !linking;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My Banks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your connected bank accounts
          </p>
        </div>
        <button
          type="button"
          disabled={!canConnect}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          onClick={() => openPlaidLink()}
        >
          {linking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {linking ? "Linking..." : "Connect Bank"}
        </button>
      </div>

      {/* ── Investment Accounts ─────────────────────────────────── */}
      {(() => {
        const investmentAccounts = getInvestmentAccountsByWorkspace(DEFAULT_WORKSPACE_ID);
        if (investmentAccounts.length === 0) return null;
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Investment Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Brokerage, IRA, and retirement accounts linked via Plaid
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {investmentAccounts.map((acct) => {
                const holdings = getHoldingsByAccount(acct.investmentAccountId).slice(0, 3);
                const totalGainLoss = holdings.reduce((s, h) => s + (h.unrealizedGainLoss ?? 0), 0);
                const gainPositive = totalGainLoss >= 0;
                return (
                  <div key={acct.investmentAccountId} className="rounded-xl bg-arcana-surface border border-arcana-border">
                    <div className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-arcana-navy">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{acct.institutionName}</p>
                            <p className="text-xs text-slate-400">
                              {ACCOUNT_TYPE_LABELS[acct.accountType]} · ...{acct.displayMask}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Balance + gain */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Total Value</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(acct.balance)}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-medium ${gainPositive ? "text-green-400" : "text-red-400"}`}>
                          {gainPositive
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />}
                          {gainPositive ? "+" : ""}{formatCurrency(totalGainLoss)}
                        </div>
                      </div>

                      {/* Top holdings */}
                      {holdings.length > 0 && (
                        <div className="space-y-2 border-t border-arcana-border pt-3">
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Top Holdings</p>
                          {holdings.map((h) => {
                            const pct = h.unrealizedGainLossPct ?? 0;
                            const up = pct >= 0;
                            return (
                              <div key={h.holdingId} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-mono font-bold text-slate-300 w-12 shrink-0">
                                    {h.security.ticker ?? "—"}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate">{h.security.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-xs font-medium text-white">{formatCurrency(h.institutionValue)}</span>
                                  <span className={`text-[10px] font-mono flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
                                    {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                    {up ? "+" : ""}{pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Sync button */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium bg-arcana-navy text-slate-300 hover:bg-arcana-border transition-colors"
                        onClick={() => {/* future: call /api/plaid/investments/holdings */}}
                      >
                        <RefreshCw className="w-3 h-3" /> Sync Holdings
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Depository / Bank Accounts ───────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white">Bank Accounts</h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-4">Checking and savings accounts linked via Plaid</p>
      </div>

      {banks.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No banks connected"
          description="Connect your first bank account to see balances and transactions"
          action={{
            label: linking ? "Linking..." : "Connect Your First Bank",
            onClick: () => openPlaidLink(),
            disabled: !canConnect,
          }}
        />
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
                      onClick={() => setUploadingBank({ bankId: bank.bankId, bankName: bank.institutionName })}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-arcana-navy text-slate-300 hover:bg-arcana-border transition-colors"
                      title="Upload a bank statement (CSV or PDF)"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
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
                    {bank.accessTokenRef && (
                      <button
                        type="button"
                        disabled={syncingBankId === bank.bankId}
                        onClick={() => syncTransactions(bank.bankId)}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-arcana-navy text-slate-300 hover:bg-arcana-border transition-colors disabled:opacity-50"
                        title="Sync transactions from Plaid"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${
                            syncingBankId === bank.bankId ? "animate-spin" : ""
                          }`}
                        />
                        Sync
                      </button>
                    )}
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

      {uploadingBank && (
        <StatementUpload
          bankId={uploadingBank.bankId}
          bankName={uploadingBank.bankName}
          onClose={() => setUploadingBank(null)}
          onSuccess={(imported) => {
            setUploadingBank(null);
            bump(); // refresh transaction counts
            // Brief toast could go here — for now bump re-renders the page
            console.info(`[StatementUpload] imported ${imported} transactions`);
          }}
        />
      )}
    </div>
  );
}
