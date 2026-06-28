\"use client\";

import { useEffect, useMemo, useState, useCallback } from \"react\";
import { HandCoins, Upload, RefreshCw, ChevronDown, ChevronUp, Sparkles } from \"lucide-react\";
import { formatCurrency, formatDate } from \"@/lib/utils\";
import { CATEGORY_LABELS } from \"@/lib/constants\";
import type { Category, Transaction, Bank } from \"@/lib/types\";
import UploadBankModal, { type BuildResult } from \"@/components/UploadBankModal\";

// ── Category filter sets ──────────────────────────────────────────────────────

const LOAN_FALLBACK_CATEGORIES = new Set<Category>([
  \"debt_personal_loan\",
  \"debt_student_loan\",
  \"debt_medical\",
  \"debt_bnpl\",
  \"debt_collections\",
  \"education_student_loan\",
  \"debt_payments\",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

type LoanAccount = Bank & { transactions: Transaction[] };

// ── Helper: load transactions for a bank ────────────────────────────────────

async function loadBankTransactions(bankId: string): Promise<Transaction[]> {
  const res = await fetch(`/api/transactions?bankId=${bankId}&page=1&pageSize=500`);
  const data = await res.json().catch(() => ({})) as { items?: Transaction[] };
  return data.items ?? [];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoansPage() {
  // Loan accounts (uploaded via statement)
  const [loanAccounts, setLoanAccounts]       = useState<LoanAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Fallback: category-filtered transactions from all banks
  const [fallbackItems, setFallbackItems]     = useState<Transaction[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(true);

  // UI state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [refreshing, setRefreshing]           = useState(false);

  // ── Load loan accounts ───────────────────────────────────────────────────

  const loadLoanAccounts = useCallback(async () => {
    try {
      const res = await fetch(\"/api/banks\");
      const data = await res.json().catch(() => ({})) as { banks?: Bank[] };
      const banks = (data.banks ?? []).filter((b) => b.accountType === \"loan\");

      const accounts: LoanAccount[] = await Promise.all(
        banks.map(async (b) => ({
          ...b,
          transactions: await loadBankTransactions(b.bankId),
        }))
      );
      setLoanAccounts(accounts);
    } catch {
      setLoanAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // ── Load fallback transactions ────────────────────────────────────────────

  const loadFallback = useCallback(async () => {
    try {
      const res = await fetch(\"/api/transactions?transactionType=expense&page=1&pageSize=500\");
      const data = await res.json().catch(() => ({})) as { items?: Transaction[] };
      setFallbackItems(
        (data.items ?? []).filter((txn) => LOAN_FALLBACK_CATEGORIES.has(txn.category as Category))
      );
    } catch {
      setFallbackItems([]);
    } finally {
      setFallbackLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLoanAccounts();
    void loadFallback();
  }, [loadLoanAccounts, loadFallback]);

  // ── Upload success ───────────────────────────────────────────────────────

  const handleUploadSuccess = useCallback(async (result: BuildResult) => {
    setShowUploadModal(false);
    setRefreshing(true);
    const txns = await loadBankTransactions(result.bank.bankId);
    const newAccount: LoanAccount = {
      bankId: result.bank.bankId,
      workspaceId: \"\",
      institutionName: result.bank.institutionName,
      accountId: result.bank.bankId,
      displayMask: result.bank.displayMask,
      shareableId: \"\",
      balance: result.bank.balance ?? 0,
      accountType: \"loan\",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: txns,
    };
    setLoanAccounts((prev) => {
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
    await Promise.all([loadLoanAccounts(), loadFallback()]);
    setRefreshing(false);
  }, [loadLoanAccounts, loadFallback]);

  // ── Derived totals ───────────────────────────────────────────────────────

  const hasLoanAccounts = loanAccounts.length > 0;

  const uploadedTotal = useMemo(
    () => loanAccounts.reduce((sum, a) => sum + a.transactions.reduce((s, t) => s + t.amount, 0), 0),
    [loanAccounts]
  );
  const uploadedCount = useMemo(
    () => loanAccounts.reduce((sum, a) => sum + a.transactions.length, 0),
    [loanAccounts]
  );

  const fallbackTotal = useMemo(() => fallbackItems.reduce((s, t) => s + t.amount, 0), [fallbackItems]);

  const isLoading = accountsLoading || fallbackLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className=\"space-y-6\">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className=\"flex items-start justify-between gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-white flex items-center gap-2\">
            <HandCoins className=\"w-6 h-6 text-cyan-300\" />
            Loans
          </h1>
          <p className=\"text-sm text-slate-400 mt-1\">
            Upload your loan statement CSV to track payments with AI categorisation.
          </p>
        </div>
        <div className=\"flex items-center gap-2 shrink-0\">
          <button
            type=\"button\"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className=\"p-2 rounded-lg border border-arcana-border text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors disabled:opacity-40\"
            title=\"Refresh\"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? \"animate-spin\" : \"\"}`} />
          </button>
          <button
            type=\"button\"
            id=\"upload-loan-btn\"
            onClick={() => setShowUploadModal(true)}
            className=\"flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-700 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity\"
          >
            <Upload className=\"w-4 h-4\" />
            Upload Statement
          </button>
        </div>
      </div>

      {/* ── Upload modal ───────────────────────────────────────────────── */}
      {showUploadModal && (
        <UploadBankModal
          accountType=\"loan\"
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* ── Uploaded loan accounts ──────────────────────────────────────── */}
      {!accountsLoading && hasLoanAccounts && (
        <div className=\"space-y-4\">
          {/* Summary strip */}
          <div className=\"rounded-xl bg-arcana-surface border border-arcana-border p-5\">
            <p className=\"text-sm text-slate-400 mb-1\">Total Loan Payments</p>
            <p className=\"text-2xl font-bold text-cyan-300\">{formatCurrency(uploadedTotal)}</p>
            <p className=\"text-xs text-slate-500 mt-1\">
              {uploadedCount.toLocaleString()} transaction{uploadedCount !== 1 ? \"s\" : \"\"} across{\" \"}
              {loanAccounts.length} loan account{loanAccounts.length !== 1 ? \"s\" : \"\"}
            </p>
          </div>

          {/* Per-account accordions */}
          {loanAccounts.map((account) => {
            const isExpanded = expandedId === account.bankId;
            const acctTotal = account.transactions.reduce((s, t) => s + t.amount, 0);
            return (
              <div
                key={account.bankId}
                className=\"rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden\"
              >
                {/* Account header row */}
                <button
                  type=\"button\"
                  onClick={() => setExpandedId(isExpanded ? null : account.bankId)}
                  className=\"w-full flex items-center justify-between px-5 py-4 hover:bg-arcana-navy/30 transition-colors\"
                >
                  <div className=\"flex items-center gap-3\">
                    <div className=\"w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center\">
                      <HandCoins className=\"w-4 h-4 text-cyan-300\" />
                    </div>
                    <div className=\"text-left\">
                      <p className=\"text-sm font-semibold text-white\">
                        {account.institutionName}
                        {account.displayMask && (
                          <span className=\"text-slate-400 ml-1 font-normal\">···{account.displayMask}</span>
                        )}
                      </p>
                      <p className=\"text-xs text-slate-500\">
                        {account.transactions.length} transaction{account.transactions.length !== 1 ? \"s\" : \"\"}
                      </p>
                    </div>
                  </div>
                  <div className=\"flex items-center gap-3\">
                    <span className=\"text-sm font-semibold text-cyan-300\">{formatCurrency(acctTotal)}</span>
                    {isExpanded ? (
                      <ChevronUp className=\"w-4 h-4 text-slate-400\" />
                    ) : (
                      <ChevronDown className=\"w-4 h-4 text-slate-400\" />
                    )}
                  </div>
                </button>

                {/* Transactions table */}
                {isExpanded && (
                  <div className=\"border-t border-arcana-border\">
                    {account.transactions.length === 0 ? (
                      <p className=\"px-5 py-6 text-sm text-slate-500\">No transactions found for this account.</p>
                    ) : (
                      <div className=\"overflow-x-auto\">
                        <table className=\"w-full text-sm min-w-[640px]\">
                          <thead>
                            <tr className=\"border-b border-arcana-border bg-arcana-navy/50\">
                              <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Description</th>
                              <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Category</th>
                              <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Date</th>
                              <th className=\"px-5 py-3 text-right text-[10px] uppercase tracking-[1.4px] text-slate-400\">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.transactions.map((txn) => (
                              <tr
                                key={txn.transactionId}
                                className=\"border-b border-arcana-border/60 last:border-0 hover:bg-arcana-navy/20 transition-colors\"
                              >
                                <td className=\"px-5 py-3 text-white max-w-[280px] truncate\">{txn.title}</td>
                                <td className=\"px-5 py-3\">
                                  <span className=\"text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20\">
                                    {CATEGORY_LABELS[txn.category as Category] ?? txn.category}
                                  </span>
                                </td>
                                <td className=\"px-5 py-3 text-slate-500 text-xs\">{formatDate(txn.date)}</td>
                                <td className=\"px-5 py-3 text-right font-medium text-cyan-300\">{formatCurrency(txn.amount)}</td>
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

      {/* ── Empty / loading state for loan accounts ─────────────────────── */}
      {accountsLoading && (
        <div className=\"rounded-xl bg-arcana-surface border border-arcana-border px-5 py-10 text-center\">
          <p className=\"text-sm text-slate-400\">Loading loan accounts…</p>
        </div>
      )}

      {!accountsLoading && !hasLoanAccounts && (
        <div className=\"rounded-xl bg-arcana-surface border border-arcana-border px-5 py-12 text-center space-y-3\">
          <div className=\"w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto\">
            <HandCoins className=\"w-6 h-6 text-cyan-400\" />
          </div>
          <p className=\"text-sm font-medium text-white\">No loan accounts yet</p>
          <p className=\"text-xs text-slate-500 max-w-xs mx-auto\">
            Upload a statement from any lender — student loans, personal loans, BNPL, or medical — and AI will categorise every payment.
          </p>
          <button
            type=\"button\"
            onClick={() => setShowUploadModal(true)}
            className=\"inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-cyan-600/20 border border-cyan-600/30 text-cyan-300 text-sm hover:bg-cyan-600/30 transition-colors\"
          >
            <Sparkles className=\"w-4 h-4\" />
            Upload your first statement
          </button>
        </div>
      )}

      {/* ── Fallback: category-matched transactions from banking accounts ── */}
      {!fallbackLoading && fallbackItems.length > 0 && (
        <div className=\"rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden\">
          <div className=\"px-5 py-3 border-b border-arcana-border flex items-center justify-between\">
            <p className=\"text-sm font-semibold text-white\">Loan Payments in Banking Accounts</p>
            <span className=\"text-xs text-slate-500\">
              {formatCurrency(fallbackTotal)} · {fallbackItems.length} transactions
            </span>
          </div>
          <div className=\"overflow-x-auto\">
            <table className=\"w-full text-sm min-w-[620px]\">
              <thead>
                <tr className=\"border-b border-arcana-border bg-arcana-navy/50\">
                  <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Title</th>
                  <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Category</th>
                  <th className=\"px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400\">Date</th>
                  <th className=\"px-5 py-3 text-right text-[10px] uppercase tracking-[1.4px] text-slate-400\">Amount</th>
                </tr>
              </thead>
              <tbody>
                {fallbackItems.map((txn) => (
                  <tr key={txn.transactionId} className=\"border-b border-arcana-border/60 last:border-0 hover:bg-arcana-navy/20 transition-colors\">
                    <td className=\"px-5 py-3 text-white max-w-[280px] truncate\">{txn.title}</td>
                    <td className=\"px-5 py-3 text-slate-400 text-xs\">
                      {CATEGORY_LABELS[txn.category as Category] ?? txn.category}
                    </td>
                    <td className=\"px-5 py-3 text-slate-500 text-xs\">{formatDate(txn.date)}</td>
                    <td className=\"px-5 py-3 text-right font-medium text-cyan-300\">{formatCurrency(txn.amount)}</td>
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
