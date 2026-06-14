"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  FileText,
  Upload,
  Download,
  Eye,
  Sparkles,
  CheckCircle2,
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

type SavedFile = {
  filename: string;
  username: string;
  sizeBytes: number;
  uploadedAt: string;
};

type ImportResult = {
  imported: number;
  duplicates: number;
  skipped: number;
  message: string;
};

type BuildResult = {
  bank?: { bankId: string; institutionName: string; displayMask: string };
  imported: number;
  periodStart: string;
  periodEnd: string;
  message: string;
  username: string;
  filename: string;
};

export default function MyBanksPage() {
  const { data: session } = useSession();
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version;
  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);

  // ── Saved statements state ──────────────────────────────────
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [selectedBankForFile, setSelectedBankForFile] = useState<Record<string, string>>({});
  const [importingFile, setImportingFile] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<Record<string, ImportResult>>({});
  const [buildingFile, setBuildingFile] = useState<string | null>(null);
  const [buildResults, setBuildResults] = useState<Record<string, BuildResult>>({});

  // Derive username from email
  const username = session?.user?.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_") ?? "";

  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [uploadingBank, setUploadingBank] = useState<{ bankId: string; bankName: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [syncingBankId, setSyncingBankId] = useState<string | null>(null);

  // Fetch saved statement files for this user
  useEffect(() => {
    if (!username) return;
    fetch(`/api/banks/statements/import-saved?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.files) setSavedFiles(data.files);
      })
      .catch(() => {});
  }, [username, version]);

  async function importSavedFile(file: SavedFile) {
    const bankId = selectedBankForFile[file.filename];
    if (!bankId) return;
    setImportingFile(file.filename);
    try {
      const res = await fetch("/api/banks/statements/import-saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: file.username,
          filename: file.filename,
          bankId,
          workspaceId: DEFAULT_WORKSPACE_ID,
        }),
      });
      const data: ImportResult = await res.json();
      setImportResults((prev) => ({ ...prev, [file.filename]: data }));
      bump();
    } catch {
      setImportResults((prev) => ({
        ...prev,
        [file.filename]: { imported: 0, duplicates: 0, skipped: 0, message: "Import failed" },
      }));
    } finally {
      setImportingFile(null);
    }
  }

  async function buildBankFromStatement(file: SavedFile) {
    setBuildingFile(file.filename);
    try {
      const res = await fetch("/api/banks/build-from-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: file.username,
          filename: file.filename,
          workspaceId: DEFAULT_WORKSPACE_ID,
        }),
      });
      const data: BuildResult = await res.json();
      setBuildResults((prev) => ({ ...prev, [file.filename]: data }));
      bump(); // refresh bank list
    } catch {
      setBuildResults((prev) => ({
        ...prev,
        [file.filename]: {
          imported: 0, periodStart: "", periodEnd: "",
          message: "Build failed — check console for details",
          username: file.username, filename: file.filename,
        },
      }));
    } finally {
      setBuildingFile(null);
    }
  }

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

      {/* ── Saved Statements ───────────────────────────────────── */}
      {savedFiles.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-arcana-sky" />
              Saved Statements
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Build a full bank account with AI-categorised transactions, or view the statement, or import into an existing account.
            </p>
          </div>
          <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
            <div className="divide-y divide-arcana-border">
              {savedFiles.map((file) => {
                const importResult = importResults[file.filename];
                const buildResult = buildResults[file.filename];
                const isImporting = importingFile === file.filename;
                const isBuilding  = buildingFile === file.filename;
                const bankId = selectedBankForFile[file.filename] ?? "";
                const kb = (file.sizeBytes / 1024).toFixed(0);
                const uploadedDate = new Date(file.uploadedAt).toLocaleDateString();

                return (
                  <div key={file.filename} className="p-4 flex flex-col gap-3">
                    {/* File info row */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-arcana-navy shrink-0">
                        <FileText className="w-4 h-4 text-arcana-sky" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                        <p className="text-[10px] text-slate-500">{kb} KB · uploaded {uploadedDate}</p>
                      </div>
                      {/* View statement button */}
                      <a
                        href={`/statement-viewer/${encodeURIComponent(file.username)}/${encodeURIComponent(file.filename)}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-arcana-navy border border-arcana-border text-slate-300 hover:border-arcana-sky hover:text-white transition-all shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </a>
                    </div>

                    {/* Action row */}
                    <div className="flex flex-col sm:flex-row gap-2 pl-12">
                      {/* ── Build Bank with AI ── */}
                      {buildResult?.bank ? (
                        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-green-900/20 border border-green-700/40">
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-green-400 truncate">
                              {buildResult.bank.institutionName} ···{buildResult.bank.displayMask} created
                            </p>
                            <p className="text-[10px] text-green-600">{buildResult.imported} transactions imported with AI categories</p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBuilding || isImporting}
                          onClick={() => buildBankFromStatement(file)}
                          className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-arcana-blue text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isBuilding ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              AI categorising transactions…
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Build Bank with AI
                            </>
                          )}
                        </button>
                      )}

                      {/* ── Import into existing bank ── */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={bankId}
                          onChange={(e) =>
                            setSelectedBankForFile((prev) => ({
                              ...prev,
                              [file.filename]: e.target.value,
                            }))
                          }
                          className="text-xs rounded-lg bg-arcana-navy border border-arcana-border text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
                        >
                          <option value="">Import into…</option>
                          {banks.map((b) => (
                            <option key={b.bankId} value={b.bankId}>
                              {b.institutionName} ···{b.displayMask}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!bankId || isImporting || isBuilding}
                          onClick={() => importSavedFile(file)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-arcana-navy border border-arcana-border text-slate-300 hover:border-arcana-blue hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isImporting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          {isImporting ? "Importing…" : "Import"}
                        </button>
                      </div>
                    </div>

                    {/* Status badges */}
                    {(importResult || (buildResult && !buildResult.bank)) && (
                      <div className="pl-12">
                        {importResult && (
                          <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md ${
                            importResult.imported > 0 ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"
                          }`}>
                            {importResult.message}
                          </div>
                        )}
                        {buildResult && !buildResult.bank && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-red-900/40 text-red-400">
                            {buildResult.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
