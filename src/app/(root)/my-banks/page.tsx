import { Landmark, Plus, Copy } from "lucide-react";
import { mockBanks } from "@/lib/mock/data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function MyBanksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Banks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your connected bank accounts
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />
          Connect Bank
        </button>
      </div>

      {mockBanks.length === 0 ? (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-12 text-center">
          <Landmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No banks connected
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Connect your first bank account to see balances and transactions
          </p>
          <button className="px-6 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            Connect Your First Bank
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockBanks.map((bank) => (
            <div
              key={bank.bankId}
              className="rounded-xl bg-arcana-surface border border-arcana-border p-5"
            >
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

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-arcana-navy rounded-lg px-3 py-2">
                <Copy className="w-3 h-3" />
                <span className="font-mono">{bank.shareableId}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <a
                  href={`/transactions?bank=${bank.bankId}`}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-medium bg-arcana-navy text-slate-300 hover:bg-arcana-border transition-colors"
                >
                  View Transactions
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
