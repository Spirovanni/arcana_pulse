"use client";

import { Briefcase, ArrowLeft, BarChart3, TrendingUp, Globe2, Building2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function MarketLeveragePage() {
  const currentComp = 110000;
  const marketMedian = 125000;
  const marketTop = 160000;
  
  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Trajectory Hub
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
            <Briefcase className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Market Leverage</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          Your structural skills map indicates a statistical mismatch between your current compensation and liquid market rates for equivalent advisory scope.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart Placeholder */}
          <div className="bg-surface-container rounded-sm border border-outline p-8 h-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <BarChart3 className="size-16 text-outline-variant mb-4 relative z-10" />
            <p className="text-secondary tracking-widest uppercase text-xs font-bold relative z-10">Distribution Curve Visualization Generator</p>
            <p className="text-slate-500 text-[10px] mt-2 max-w-xs text-center relative z-10">Ingesting local market bands and generating statistical yield plots.</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-surface-container-high border border-outline rounded-sm p-6">
                <div className="flex items-center gap-2 text-xs text-secondary uppercase tracking-widest font-bold mb-4">
                  <Globe2 className="size-4 text-arcana-sky" /> Geo Arbitrage
                </div>
                <div className="text-2xl font-light text-on-surface mb-2">{formatCurrency(145000)}</div>
                <div className="text-xs text-arcana-sky font-mono">+32% Premium (US Remote Hubs)</div>
             </div>
             <div className="bg-surface-container-high border border-outline rounded-sm p-6">
                <div className="flex items-center gap-2 text-xs text-secondary uppercase tracking-widest font-bold mb-4">
                  <Building2 className="size-4 text-purple-400" /> Firm Scope
                </div>
                <div className="text-2xl font-light text-on-surface mb-2 border-b border-primary/20 pb-2 inline-block">Series B+</div>
                <div className="text-xs text-secondary mt-2">Optimal equity-to-risk ratio for your skill cohort.</div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-outline/50 rounded-sm p-6 space-y-6">
             <h3 className="font-headline text-lg text-on-surface uppercase tracking-tight">Compensation Delta</h3>
             
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs mb-1">
                     <span className="text-secondary">Current Base</span>
                     <span className="text-on-surface font-mono">{formatCurrency(currentComp)}</span>
                  </div>
                  <div className="w-full bg-outline/20 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-slate-500/50 h-full w-[60%]"></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1">
                     <span className="text-secondary flex items-center gap-1"><TrendingUp className="size-3 text-primary"/> Median Market Baseline</span>
                     <span className="text-on-surface font-mono">{formatCurrency(marketMedian)}</span>
                  </div>
                  <div className="w-full bg-outline/20 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-primary h-full w-[75%] shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1">
                     <span className="text-secondary text-arcana-success">Top Percentile (L6/L7)</span>
                     <span className="text-on-surface font-mono">{formatCurrency(marketTop)}</span>
                  </div>
                  <div className="w-full bg-outline/20 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-arcana-success h-full w-[95%]"></div>
                  </div>
               </div>
             </div>

             <div className="pt-6 border-t border-outline/30">
               <button className="w-full py-3 bg-primary text-background text-xs uppercase tracking-widest font-bold hover:bg-primary-container transition-colors rounded-sm shadow-[0_0_15px_rgba(197,160,89,0.3)]">
                 Initialize Negotiation Simulator
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
