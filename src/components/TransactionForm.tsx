"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import type {
  Transaction,
  TransactionType,
  Category,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";

const INCOME_CATEGORIES: Category[] = [
  "salary",
  "freelance",
  "investment",
  "refund",
  "other_income",
];

const EXPENSE_CATEGORIES: Category[] = [
  "housing",
  "transportation",
  "food",
  "utilities",
  "healthcare",
  "entertainment",
  "shopping",
  "education",
  "subscriptions",
  "travel",
  "other",
];

interface TransactionFormProps {
  mode: "create" | "edit";
  defaultType?: TransactionType;
  transaction?: Transaction | null;
  onSubmit: (data: CreateTransactionInput | UpdateTransactionInput) => void;
  onClose: () => void;
}

export default function TransactionForm({
  mode,
  defaultType,
  transaction,
  onSubmit,
  onClose,
}: TransactionFormProps) {
  const [txnType, setTxnType] = useState<TransactionType>(
    transaction?.transactionType ?? defaultType ?? "expense"
  );
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [category, setCategory] = useState<Category>(
    transaction?.category ?? (txnType === "income" ? "salary" : "food")
  );
  const [amount, setAmount] = useState(
    transaction ? transaction.amount.toString() : ""
  );
  const [date, setDate] = useState(
    transaction
      ? transaction.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  const categories =
    txnType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function suggestCategory() {
    if (!title.trim() || aiLoading) return;
    setAiLoading(true);
    setAiConfidence(null);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount) || 0,
          transactionType: txnType === "transfer" ? "expense" : txnType,
        }),
      });
      const data = await res.json();
      if (data.category && categories.includes(data.category as Category)) {
        setCategory(data.category as Category);
        setAiConfidence(data.confidence ?? null);
      }
    } catch {
      // silent fail
    } finally {
      setAiLoading(false);
    }
  }

  // Reset category when type changes
  useEffect(() => {
    if (!transaction) {
      setCategory(txnType === "income" ? "salary" : "food");
    }
  }, [txnType, transaction]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (mode === "create") {
      onSubmit({
        workspaceId: "",
        transactionType: txnType,
        title: title.trim(),
        category,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        note: note.trim(),
      } satisfies CreateTransactionInput);
    } else {
      onSubmit({
        title: title.trim(),
        category,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        note: note.trim(),
      } satisfies UpdateTransactionInput);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-arcana-surface border border-arcana-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {mode === "create" ? "Add Transaction" : "Edit Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector (only in create mode without forced type) */}
          {mode === "create" && !defaultType && (
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Type
              </label>
              <div className="flex gap-2">
                {(["income", "expense"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxnType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      txnType === t
                        ? t === "income"
                          ? "bg-arcana-success text-white"
                          : "bg-arcana-danger text-white"
                        : "bg-arcana-navy text-slate-400 hover:text-white"
                    }`}
                  >
                    {t === "income" ? "Income" : "Expense"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Salary"
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-slate-300">Category</label>
              <button
                type="button"
                title="AI suggest category"
                onClick={suggestCategory}
                disabled={!title.trim() || aiLoading || txnType === "transfer"}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold text-arcana-blue hover:bg-arcana-blue/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                AI Suggest
              </button>
            </div>
            <select
              title="Transaction category"
              value={category}
              onChange={(e) => { setCategory(e.target.value as Category); setAiConfidence(null); }}
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {aiConfidence !== null && (
              <p className="mt-1 text-[10px] text-arcana-blue/70">
                AI suggested · {Math.round(aiConfidence * 100)}% confidence
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-arcana-navy text-slate-300 text-sm font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              {mode === "create" ? "Add" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
