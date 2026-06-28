"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CreditCard, Upload, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category, Transaction, Bank } from "@/lib/types";
import UploadBankModal, { type BuildResult } from "@/components/UploadBankModal";
import { getIssuerLogoUrl } from "@/lib/issuerLogos";

// ── Category filter sets ──────────────────────────────────────────────────────

const CC_FALLBACK_CATEGORIES = new Set<Category>([
  "debt_credit_card",
  "debt_payments",
  "financial_fees",
  "fees_bank",
  "fees_atm",
  "fees_overdraft",
  "fees_wire_transfer",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

type CardAccount = Bank & { transactions: Transaction[] };

function IssuerMark({ institutionName }: { institutionName: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = getIssuerLogoUrl(institutionName);

  if (!logoUrl || imgFailed) {
    return <CreditCard className="w-4 h-4 text-amber-300" />;
  }

  return (
    <img
      src={logoUrl}
      alt={`${institutionName} logo`}
      className="h-4 w-auto max-w-[28px] object-contain"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
    />
  );
}

// ── Helper: load transactions for a bank ────────────────────────────────────

async function loadBankTransactions(bankId: string): Promise<Transaction[]> {
  const res = await fetch(`/api/transactions?bankId=${bankId}&page=1&pageSize=500`);
  const data = await res.json().catch(() => ({})) as { items?: Transaction[] };
  return data.items ?? [];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreditCardsPage() {
  // Card accounts (uploaded via statement)
  const [cardAccounts, setCardAccounts]       = useState<CardAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Fallback: category-filtered transactions from all banks
  const [fallbackItems, setFallbackItems]     = useState<Transaction[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  // UI state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [refreshing, setRefreshing]           = useState(false);

  // ── Load card accounts ───────────────────────────────────────────────────

  const loadCardAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/banks");
      const data = await res.json().catch(() => ({})) as { banks?: Bank[] };
      const banks = (data.banks ?? []).filter((b) => b.accountType === "credit_card");

      const accounts: CardAccount[] = await Promise.all(
        banks.map(async (b) => ({
          ...b,
          transactions: await loadBankTransactions(b.bankId),
        }))
      );
      setCardAccounts(accounts);
    } catch {
      setCardAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // ── Load fallback transactions ────────────────────────────────────────────

  const loadFallback = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?transactionType=expense&page=1&pageSize=500");
      const data = await res.json().catch(() => ({})) as { items?: Transaction[] };
      setFallbackItems(
        (data.items ?? []).filter((txn) => CC_FALLBACK_CATEGORIES.has(txn.category as Category))
      );
    } catch {
      setFallbackItems([]);
    } finally {
      setFallbackLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCardAccounts();
    void loadFallback();
  }, [loadCardAccounts, loadFallback]);

  // ── Upload success ───────────────────────────────────────────────────────

  const handleUploadSuccess = useCallback(async (result: BuildResult) => {
    setShowUploadModal(false);
    setRefreshing(true);
    // Load the newly created account's transactions immediately
    const txns = await loadBankTransactions(result.bank.bankId);
    const newAccount: CardAccount = {
      bankId: result.bank.bankId,
      workspaceId: "",
      institutionName: result.bank.institutionName,
      accountId: result.bank.bankId,
      displayMask: result.bank.displayMask,
      shareableId: "",
      balance: result.bank.balance ?? 0,
      accountType: "credit_card",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: txns,
    };
    setCardAccounts((prev) => {
      const exists = prev.find((a) => a.bankId === result.bank.bankId);
      return exists ? prev : [newAccount, ...prev];
    });
    setExpandedId(result.bank.bankId);
    setRefreshing(false);
  }, []);

  // ── Refresh ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setAccountsLoading(true);
    setFallbackLoading(true);
    await Promise.all([loadCardAccounts(), loadFallback()]);
    setRefreshing(false);
  }, [loadCardAccounts, loadFallback]);

  // ── Derived totals ───────────────────────────────────────────────────────

  const hasCardAccounts = cardAccounts.length > 0;

  const uploadedTotal = useMemo(
    () => cardAccounts.reduce((sum, a) => sum + a.transactions.reduce((s, t) => s + t.amount, 0), 0),
    [cardAccounts]
  );
  const uploadedCount = useMemo(
    () => cardAccounts.reduce((sum, a) => sum + a.transactions.length, 0),
    [cardAccounts]
  );

  const fallbackTotal = useMemo(() => fallbackItems.reduce((s, t) => s + t.amount, 0), [fallbackItems]);

  const isLoading = accountsLoading || fallbackLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-300" />
            Credit Cards
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload your credit card statement CSV to track charges with AI categorisation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="p-2 rounded-lg border border-arcana-border text-slate-400 hover:text-white hover:border-amber-500/40 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            id="upload-credit-card-btn"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            Upload Statement
          </button>
        </div>
      </div>

      {/* ── Upload modal ───────────────────────────────────────────────── */}
      {showUploadModal && (
        <UploadBankModal
          accountType="credit_card"
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* ── Uploaded card accounts ──────────────────────────────────────── */}
      {!accountsLoading && hasCardAccounts && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
            <p className="text-sm text-slate-400 mb-1">Total Credit Card Charges</p>
            <p className="text-2xl font-bold text-amber-300">{formatCurrency(uploadedTotal)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {uploadedCount.toLocaleString()} transaction{uploadedCount !== 1 ? "s" : ""} across{" "}
              {cardAccounts.length} card account{cardAccounts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Per-account accordions */}
          {cardAccounts.map((account) => {
            const isExpanded = expandedId === account.bankId;
            const acctTotal = account.transactions.reduce((s, t) => s + t.amount, 0);
            return (
              <div
                key={account.bankId}
                className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden"
              >
                {/* Account header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : account.bankId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-arcana-navy/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                      <IssuerMark institutionName={account.institutionName} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">
                        {account.institutionName}
                        {account.displayMask && (
                          <span className="text-slate-400 ml-1 font-normal">···{account.displayMask}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {account.transactions.length} transaction{account.transactions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-amber-300">{formatCurrency(acctTotal)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Transactions table */}
                {isExpanded && (
                  <div className="border-t border-arcana-border">
                    {account.transactions.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-500">No transactions found for this account.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                          <thead>
                            <tr className="border-b border-arcana-border bg-arcana-navy/50">
                              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Description</th>
                              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Category</th>
                              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Date</th>
                              <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[1.4px] text-slate-400">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.transactions.map((txn) => (
                              <tr
                                key={txn.transactionId}
                                className="border-b border-arcana-border/60 last:border-0 hover:bg-arcana-navy/20 transition-colors"
                              >
                                <td className="px-5 py-3 text-white max-w-[280px] truncate">{txn.title}</td>
                                <td className="px-5 py-3">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    {CATEGORY_LABELS[txn.category as Category] ?? txn.category}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(txn.date)}</td>
                                <td className="px-5 py-3 text-right font-medium text-amber-300">{formatCurrency(txn.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty / loading state for card accounts ─────────────────────── */}
      {accountsLoading && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border px-5 py-10 text-center">
          <p className="text-sm text-slate-400">Loading credit card accounts…</p>
        </div>
      )}

      {!accountsLoading && !hasCardAccounts && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border px-5 py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-white">No credit card accounts yet</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Upload a CSV statement from any credit card issuer and AI will categorise every charge instantly.
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-amber-600/20 border border-amber-600/30 text-amber-300 text-sm hover:bg-amber-600/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Upload your first statement
          </button>
        </div>
      )}

      {/* ── Fallback: category-matched transactions from banking accounts ── */}
      {!fallbackLoading && fallbackItems.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
          <div className="px-5 py-3 border-b border-arcana-border flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Credit Card Payments in Banking Accounts</p>
            <span className="text-xs text-slate-500">
              {formatCurrency(fallbackTotal)} · {fallbackItems.length} transactions
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-arcana-border bg-arcana-navy/50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Title</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Card Company</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Category</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Date</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[1.4px] text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {fallbackItems.map((txn) => (
                  <tr key={txn.transactionId} className="border-b border-arcana-border/60 last:border-0 hover:bg-arcana-navy/20 transition-colors">
                    <td className="px-5 py-3 text-white max-w-[280px] truncate">{txn.title}</td>
                    <td className="px-5 py-3 text-slate-300 text-xs">{txn.institutionName ?? "Statement Upload"}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {CATEGORY_LABELS[txn.category as Category] ?? txn.category}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(txn.date)}</td>
                    <td className="px-5 py-3 text-right font-medium text-amber-300">{formatCurrency(txn.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
