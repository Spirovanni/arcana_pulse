"use client";

import { useSession } from "next-auth/react";
import { Building2, Users, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CandidateFunnelWidget } from "@/components/CandidateFunnelWidget";
import { EmployerLedgerWidget } from "@/components/EmployerLedgerWidget";
import { mockTransactions, mockCandidates } from "@/lib/mock/data";

export default function EmployerDashboard() {
  const { data: session } = useSession();

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline/30">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary text-[10px] uppercase tracking-[3px] border border-primary/20 rounded-sm mb-2 shadow-[0_0_10px_rgba(197,160,89,0.1)]">
             <Building2 className="size-3" /> Employer Portal Active
          </div>
          <h1 className="font-headline text-3xl font-light text-on-surface">
            Welcome back, {session?.user?.firstName || "Partner"}
          </h1>
          <p className="text-secondary text-sm tracking-wide">
            Manage your firm&apos;s ledger and oversee candidate matching trajectories.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
        {/* Left Column: Corporate Ledger */}
        <div className="lg:col-span-4 h-full">
          <EmployerLedgerWidget transactions={mockTransactions} />
        </div>

        {/* Right Column: Candidate Funnel */}
        <div className="lg:col-span-8 h-full">
          <CandidateFunnelWidget candidates={mockCandidates} />
        </div>
      </div>
    </div>
  );
}
