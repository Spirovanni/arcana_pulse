"use client";

import { GraduationCap, ArrowLeft, ShieldCheck, Flame, Scale } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function SovereignPivotPage() {
  const runwayTarget = 75000;
  const runwayCurrent = 32000;
  const progressPercent = Math.min((runwayCurrent / runwayTarget) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Trajectory Hub
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <GraduationCap className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Sovereign Pivot</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          The ultimate asset is structural independence. Modeling the exact financial runway required to seamlessly fork your 1099 or Founder entity away from legacy employment constraints.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container-high rounded-sm border border-outline p-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-purple-500/10 pointer-events-none" />
           <ShieldCheck className="size-8 text-purple-400 mb-6 relative z-10" />
           <h3 className="font-headline text-2xl text-on-surface mb-2 relative z-10">Runway Burn Matrix</h3>
           <p className="text-sm text-secondary leading-relaxed mb-8 relative z-10">
             Targeting a 9-month absolute survival runway covering core ops and personal liabilities before corporate execution.
           </p>

           <div className="space-y-2 relative z-10 mb-8">
             <div className="flex justify-between items-end mb-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold border-b border-primary/20 pb-1">Capital Reserves</span>
                <span className="font-mono text-xl text-on-surface tracking-tighter">{formatCurrency(runwayCurrent)} <span className="text-xs text-secondary">/ {formatCurrency(runwayTarget)}</span></span>
             </div>
             <div className="w-full h-3 bg-surface border border-outline rounded-sm overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]" style={{ width: `${progressPercent}%` }}></div>
             </div>
             <p className="text-[10px] text-right text-purple-400/80 font-mono tracking-widest">{progressPercent.toFixed(0)}% IGNITION READY</p>
           </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="bg-surface border border-outline/50 p-6 rounded-sm flex items-start gap-4 hover:border-purple-500/30 transition-colors cursor-default">
             <div className="p-2 rounded bg-arcana-warning/10 text-arcana-warning border border-arcana-warning/20">
               <Flame className="size-5" />
             </div>
             <div>
                <h4 className="text-slate-200 font-medium tracking-wide">Venture Risk Profiler</h4>
                <p className="text-xs text-secondary mt-1 max-w-sm">Determine optimal entity formation (LLC vs C-Corp) based on your projected risk tolerance mapping.</p>
             </div>
          </div>
          <div className="bg-surface border border-outline/50 p-6 rounded-sm flex items-start gap-4 hover:border-purple-500/30 transition-colors cursor-default">
             <div className="p-2 rounded bg-arcana-sky/10 text-arcana-sky border border-arcana-sky/20">
               <Scale className="size-5" />
             </div>
             <div>
                <h4 className="text-slate-200 font-medium tracking-wide">Tax Arbitrage</h4>
                <p className="text-xs text-secondary mt-1 max-w-sm">Compute effective tax shields scaling against independent contracting versus standardized brackets.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
