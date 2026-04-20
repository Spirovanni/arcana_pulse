"use client";

import { useMemo } from "react";
import { Transaction } from "@/lib/types";
import { Building2, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";


export function EmployerLedgerWidget({ transactions }: { transactions: Transaction[] }) {
  const corporateExpenses = useMemo(() => transactions.filter(t => t.transactionType === "expense"), [transactions]);
  
  const totalSpend = useMemo(() => corporateExpenses.reduce((sum, t) => sum + t.amount, 0), [corporateExpenses]);

  return (
    <div className="bg-surface-container rounded-lg border border-outline/50 p-6 shadow-sm ring-1 ring-white/5 flex flex-col h-full">
      <div className="flex flex-col mb-8 gap-1 border-b border-outline/30 pb-6">
        <h3 className="text-lg font-headline font-medium text-slate-100 flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          Corporate Ledger Operations
        </h3>
        <p className="text-sm text-slate-400">Monthly Burn Rate: <span className="text-white font-mono">{formatCurrency(totalSpend)}</span></p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 mb-4">
        <div className="space-y-3">
          {corporateExpenses.map((txn) => (
            <div key={txn.transactionId} className="flex items-center justify-between p-4 bg-surface border border-outline/40 rounded-md hover:bg-surface-container-high transition-colors group">
               <div className="flex items-center gap-4">
                 <div className={`size-10 rounded flex items-center justify-center bg-arcana-warning/10 border border-arcana-warning/20`}>
                   <ArrowUpRight className="size-5 text-arcana-warning" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm font-medium text-slate-200">{txn.title}</span>
                   <span className="text-xs text-slate-500 uppercase tracking-widest">{txn.category} • {new Date(txn.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                 </div>
               </div>
               
               <div className="flex flex-col items-end">
                 <span className="text-sm font-mono text-slate-300">-{formatCurrency(txn.amount)}</span>
                 <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest mt-1">
                    {txn.status === "posted" ? (
                      <span className="text-arcana-success flex items-center gap-1"><CheckCircle2 className="size-3"/> Posted</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><Clock className="size-3"/> Pending</span>
                    )}
                 </div>
               </div>
            </div>
          ))}

          {corporateExpenses.length === 0 && (
             <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-outline/40 rounded-md">
                No active corporate operations.
             </div>
          )}
        </div>
      </div>
      
      <button className="w-full py-3 bg-surface-container-high hover:bg-outline/50 border border-outline rounded-md text-xs uppercase tracking-widest font-bold text-slate-300 transition-colors">
         Full Audit Logs
      </button>
    </div>
  );
}
