"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category, Transaction } from "@/lib/types";

type TransactionsResponse = {
  items?: Transaction[];
};

export default function CreditCardsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/transactions?transactionType=expense&page=1&pageSize=500");
        const data: TransactionsResponse = await res.json().catch(() => ({}));
        if (!cancelled) {
          setItems((data.items ?? []).filter((txn) => (txn.category as Category) === "debt_credit_card"));
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => items.reduce((sum, txn) => sum + txn.amount, 0), [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit Cards</h1>
          <p className="text-sm text-slate-400 mt-1">Dedicated view of all credit card debt payment activity.</p>
        </div>
        <CreditCard className="w-6 h-6 text-amber-300" />
      </div>

      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <p className="text-sm text-slate-400 mb-1">Total Credit Card Payments</p>
        <p className="text-2xl font-bold text-amber-300">{formatCurrency(total)}</p>
        <p className="text-xs text-slate-500 mt-1">{items.length} transactions</p>
      </div>

      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-5 py-3 border-b border-arcana-border text-sm font-semibold text-white">Transactions</div>
        {loading ? (
          <div className="px-5 py-8 text-sm text-slate-400">Loading credit card transactions...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">No credit card payment transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-arcana-border bg-arcana-navy/50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Title</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Category</th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[1.4px] text-slate-400">Date</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[1.4px] text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((txn) => (
                  <tr key={txn.transactionId} className="border-b border-arcana-border/60 last:border-0">
                    <td className="px-5 py-3 text-white">{txn.title}</td>
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
        )}
      </div>
    </div>
  );
}
