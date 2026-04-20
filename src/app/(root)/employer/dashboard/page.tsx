"use client";

import { useSession } from "next-auth/react";
import { Building2, Users, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container rounded-sm border border-outline p-6 hover:border-primary/30 transition-colors shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                 <Briefcase className="size-5 text-primary" />
             </div>
             <span className="text-xs font-mono text-secondary">Active Ledger</span>
          </div>
          <h3 className="text-2xl font-light text-on-surface mb-1">{formatCurrency(453000)}</h3>
          <p className="text-xs text-arcana-success flex items-center gap-1"><CheckCircle2 className="size-3"/> Target Reserves Met</p>
        </div>

        <div className="bg-surface-container rounded-sm border border-outline p-6 hover:border-primary/30 transition-colors shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <div className="size-10 rounded bg-arcana-sky/10 border border-arcana-sky/20 flex items-center justify-center">
                 <Users className="size-5 text-arcana-sky" />
             </div>
             <span className="text-xs font-mono text-secondary">Candidates Tracking</span>
          </div>
          <h3 className="text-2xl font-light text-on-surface mb-1">12</h3>
          <p className="text-xs text-arcana-sky/80">4 pending final reviews</p>
        </div>
      </div>

      <div className="bg-surface-container-high rounded-sm border border-outline p-8">
         <h2 className="text-lg font-headline font-medium text-on-surface mb-4">Platform Intelligence</h2>
         <p className="text-sm text-secondary leading-relaxed max-w-2xl mb-6">
           This dashboard acts as your corporate operating system. You are currently viewing the placeholder intercept layer. In future iterations, your candidate funnels and corporate expense ledgers will mount here automatically.
         </p>
         <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-container transition-colors uppercase tracking-widest font-bold">
            View Standard Ledger <ChevronRight className="size-4" />
         </Link>
      </div>
    </div>
  );
}
