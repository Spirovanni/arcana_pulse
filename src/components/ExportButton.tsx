"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, Table, ChevronDown, Calendar } from "lucide-react";
import { exportTransactionsToCSV, exportTransactionsToPDF } from "@/lib/export";
import { listTransactions } from "@/lib/services/transactions";
import type { TransactionFilter } from "@/lib/types";

interface ExportButtonProps {
  baseFilter: Omit<TransactionFilter, "dateFrom" | "dateTo">;
  reportTitle?: string;
}

export default function ExportButton({ baseFilter, reportTitle = "Transaction Report" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function getAllTransactions() {
    const filter: TransactionFilter = {
      ...baseFilter,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    };
    return listTransactions(filter, { page: 1, pageSize: 10_000 }).items;
  }

  function handleCSV() {
    const txns = getAllTransactions();
    const suffix = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : "";
    exportTransactionsToCSV(txns, `arcana_transactions${suffix}.csv`);
    setOpen(false);
  }

  function handlePDF() {
    const txns = getAllTransactions();
    const subtitle = dateFrom || dateTo
      ? `${dateFrom || "All time"} to ${dateTo || "present"}`
      : undefined;
    exportTransactionsToPDF(txns, reportTitle, subtitle);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-sm border border-outline text-secondary text-xs uppercase tracking-[1px] font-bold hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-surface-container-high border border-outline shadow-2xl z-50 rounded-sm">
          {/* Date range */}
          <div className="p-4 border-b border-outline/40">
            <div className="flex items-center gap-1.5 mb-3">
              <Calendar className="w-3 h-3 text-secondary" />
              <span className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Date Range (optional)</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-secondary/60 uppercase tracking-wider block mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-container border border-outline text-on-surface text-xs rounded-sm focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[10px] text-secondary/60 uppercase tracking-wider block mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-container border border-outline text-on-surface text-xs rounded-sm focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Format options */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleCSV}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-container rounded-sm transition-colors text-left group"
            >
              <div className="p-1.5 bg-primary/10 rounded-sm">
                <Table className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface font-medium group-hover:text-primary transition-colors">Export CSV</p>
                <p className="text-[10px] text-secondary">Spreadsheet-ready data</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handlePDF}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-container rounded-sm transition-colors text-left group"
            >
              <div className="p-1.5 bg-primary/10 rounded-sm">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface font-medium group-hover:text-primary transition-colors">Export PDF</p>
                <p className="text-[10px] text-secondary">Formatted report with summary</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
