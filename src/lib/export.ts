import type { Transaction } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

// ─── CSV ─────────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportTransactionsToCSV(transactions: Transaction[], filename = "transactions.csv"): void {
  const headers = ["Date", "Title", "Type", "Source", "Category", "Amount", "Status", "Note"];
  const rows = transactions.map((txn) => [
    txn.date,
    txn.title,
    txn.transactionType,
    txn.sourceType,
    CATEGORY_LABELS[txn.category] ?? txn.category,
    txn.transactionType === "income" ? txn.amount : -txn.amount,
    txn.status,
    txn.note ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── PDF (print window) ───────────────────────────────────────────────────────

export function exportTransactionsToPDF(
  transactions: Transaction[],
  title = "Transaction Report",
  subtitle = "",
): void {
  const totalIncome = transactions
    .filter((t) => t.transactionType === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.transactionType === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const rows = transactions
    .map((txn) => {
      const sign = txn.transactionType === "income" ? "+" : txn.transactionType === "expense" ? "-" : "";
      const amtColor = txn.transactionType === "income" ? "#4ade80" : txn.transactionType === "expense" ? "#f87171" : "#94a3b8";
      return `<tr>
        <td>${txn.date}</td>
        <td>${txn.title}</td>
        <td><span class="badge ${txn.transactionType}">${txn.transactionType}</span></td>
        <td>${CATEGORY_LABELS[txn.category] ?? txn.category}</td>
        <td style="color:${amtColor};text-align:right;font-family:monospace">${sign}${formatCurrency(txn.amount)}</td>
        <td><span class="badge ${txn.status}">${txn.status}</span></td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 32px; font-size: 12px; }
    h1 { font-size: 20px; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 11px; margin-bottom: 24px; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: #f8f8f8; border: 1px solid #e5e5e5; }
    .summary-item { flex: 1; }
    .summary-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .summary-value { font-size: 18px; font-weight: 300; }
    .income { color: #16a34a; } .expense { color: #dc2626; } .net-pos { color: #16a34a; } .net-neg { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f1f1f1; }
    th { padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-radius: 2px; }
    .badge.income { background: #dcfce7; color: #16a34a; }
    .badge.expense { background: #fee2e2; color: #dc2626; }
    .badge.transfer { background: #dbeafe; color: #2563eb; }
    .badge.posted { background: #dcfce7; color: #16a34a; }
    .badge.pending { background: #fef9c3; color: #ca8a04; }
    .badge.failed { background: #fee2e2; color: #dc2626; }
    .footer { margin-top: 24px; font-size: 9px; color: #aaa; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle || `Generated ${new Date().toLocaleDateString()} · ${transactions.length} transactions`}</div>
  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total Income</div>
      <div class="summary-value income">+${formatCurrency(totalIncome)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value expense">-${formatCurrency(totalExpense)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Net Cash Flow</div>
      <div class="summary-value ${net >= 0 ? "net-pos" : "net-neg"}">${net >= 0 ? "+" : ""}${formatCurrency(net)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Transactions</div>
      <div class="summary-value">${transactions.length}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Title</th><th>Type</th><th>Category</th><th style="text-align:right">Amount</th><th>Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Arcana Pulse · Confidential · ${new Date().toISOString().slice(0, 10)}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
