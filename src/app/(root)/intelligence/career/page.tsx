"use client";

import { Target, Compass, Briefcase, Award, GraduationCap, Bot, BookOpen, FileText, Building2, Users } from "lucide-react";
import CareerTrajectoryWidget from "@/components/CareerTrajectoryWidget";
import ActivePathwayWidget from "@/components/ActivePathwayWidget";
import Link from "next/link";

export default function CareerPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-outline/30">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(197,160,89,0.15)]">
               <Compass className="size-5" />
            </span>
            <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Arcana Advisor Academy</h1>
          </div>
          <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
            Your human capital is a compounding asset class. We map unstructured salary floors against continuous AI-calibrated optimization routes, giving you a statistical edge in the labor market.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-sm bg-primary/5 text-primary border border-primary/20 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 relative overflow-hidden">
             <div className="size-1.5 rounded-full bg-primary animate-pulse" />
             Strategic Path Generated
             <div className="absolute inset-0 bg-primary/5 rounded-sm filter blur-md" />
          </div>
        </div>
      </header>

      {/* Supported Pathways Marquee */}
      <div className="space-y-4">
        <h2 className="text-[10px] uppercase tracking-widest text-secondary font-bold pl-1">Actively Supported Pathways</h2>
        <div className="flex flex-wrap gap-3">
           {["Financial Advisor", "Registered Representative", "Wealth Management Associate", "Client Relationship Associate", "Insurance / Retirement Planning Support", "Financial Coach", "Credit Union Member Advisor", "Community Financial Navigator"].map((path) => (
              <div key={path} className="px-3 py-1.5 rounded-sm bg-surface-container border border-outline/50 text-xs text-slate-300 font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-default shadow-sm">
                 {path}
              </div>
           ))}
        </div>
        <p className="text-secondary text-xs leading-relaxed max-w-4xl mt-3 pl-1 italic">
           Engineered to accelerate beginners and career-switchers entering the financial services sphere. We connect individual career mobility directly against our larger mission: democratizing financial education, compounding family asset-building, and establishing generational sovereignty. 
        </p>
      </div>

      {/* Active Pathway Execution Widget */}
      <div className="space-y-4">
        <ActivePathwayWidget />
      </div>

      {/* Main Asset Projection Widget */}
      <div className="space-y-6">
        <h2 className="text-on-surface font-headline text-xl flex items-center gap-2 border-l-2 border-primary pl-4 tracking-tighter">
           <Target className="size-4 text-primary" /> Long-Term Valuation Modeling
        </h2>
        <div className="ml-4">
          <CareerTrajectoryWidget />
        </div>
      </div>

      {/* Secondary Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-6">
         {/* Node 1 */}
         <div className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-primary/10" />
            <div className="size-10 bg-primary/10 border border-primary/20 rounded flex items-center justify-center mb-6">
               <Briefcase className="size-5 text-primary" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Market Leverage</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
              Your structural skills map indicates a 14% delta between your current compensation and the median market leverage for equivalent financial advisory scope.
            </p>
            <Link href="/intelligence/career/market-leverage" className="inline-block text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary-container transition-colors">
               Analyze Gap &rarr;
            </Link>
         </div>

         {/* Node 2 — Skill Acquisitions */}
         <div className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-teal-500/10" />
            <div className="size-10 bg-teal-500/10 border border-teal-500/20 rounded flex items-center justify-center mb-6">
               <Award className="size-5 text-teal-400" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Skill Acquisitions</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
               Acquiring your FINRA Series 7 directly unlocks fiduciary architectural positioning, scaling your total advisory equity ceiling by a factor of 1.8x.
            </p>
            <div className="flex flex-col gap-2">
               <Link href="/intelligence/career/skills" className="inline-block text-[10px] uppercase font-bold tracking-widest text-teal-400 hover:text-teal-300 transition-colors">
                  View Tech-Tree &rarr;
               </Link>
               <Link href="/intelligence/career/roadmap" className="inline-block text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary-container transition-colors">
                  Full Roadmap &rarr;
               </Link>
            </div>
         </div>

         {/* Node 3 */}
         <div className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-purple-500/10" />
            <div className="size-10 bg-purple-500/10 border border-purple-500/20 rounded flex items-center justify-center mb-6">
               <GraduationCap className="size-5 text-purple-400" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Sovereign Pivot</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
               Probability analysis flags a 60% chance you outgrow current employment dynamics within 24 months. Recommend founding parameters.
            </p>
            <Link href="/intelligence/career/sovereign-pivot" className="inline-block text-[10px] uppercase font-bold tracking-widest text-purple-400 hover:text-purple-300 transition-colors">
               View Scenarios &rarr;
            </Link>
         </div>

         {/* Node 4 — Licensing Readiness */}
         <div className="bg-surface-container-high border border-primary/20 rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-primary/10" />
            <div className="size-10 bg-primary/10 border border-primary/20 rounded flex items-center justify-center mb-6">
               <Award className="size-5 text-primary" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Licensing Readiness</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
               SIE passed. Series 63 at 58% readiness. Track your full FINRA / NASAA credential stack and unlock a +61% cumulative compensation ceiling.
            </p>
            <Link href="/intelligence/career/licensing" className="inline-block text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary-container transition-colors">
               View Credentials &rarr;
            </Link>
         </div>
      </div>

      {/* Placement Pipeline Banner */}
      <div className="bg-surface-container border border-teal-500/20 rounded-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-teal-500/30 transition-colors">
         <div className="flex items-start gap-4">
            <div className="p-2 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 mt-0.5">
               <Building2 className="size-4" />
            </div>
            <div className="space-y-0.5">
               <div className="flex items-center gap-2">
                  <h3 className="font-headline text-base text-on-surface font-light">Job Placement Pipeline</h3>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-teal-400 border border-teal-400/30 bg-teal-400/5 px-2 py-0.5 rounded-sm">5 Matches</span>
               </div>
               <p className="text-secondary text-xs max-w-xl leading-relaxed">
                  94% top match at Meridian Wealth Partners. Track applications from first contact to offer across RIA, wirehouse, and credit union hiring ledgers.
               </p>
            </div>
         </div>
         <Link href="/intelligence/career/placement" className="shrink-0 px-5 py-2 bg-teal-500/10 text-teal-400 text-[10px] uppercase tracking-widest font-bold border border-teal-500/20 hover:bg-teal-500/20 transition-colors rounded-sm whitespace-nowrap">
            View Matches &rarr;
         </Link>
      </div>

      {/* Resume Builder Banner */}
      <div className="bg-surface-container border border-outline/50 rounded-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-primary/20 transition-colors">
         <div className="flex items-start gap-4">
            <div className="p-2 rounded bg-primary/10 border border-primary/20 text-primary mt-0.5">
               <FileText className="size-4" />
            </div>
            <div className="space-y-0.5">
               <div className="flex items-center gap-2">
                  <h3 className="font-headline text-base text-on-surface font-light">Resume & Interview Builder</h3>
               </div>
               <p className="text-secondary text-xs max-w-xl leading-relaxed">
                  W2 + 1099 profile builder with AI bullet optimization and live resume preview. Export PDF-ready for wirehouse and RIA hiring pipelines.
               </p>
            </div>
         </div>
         <Link href="/intelligence/career/resume" className="shrink-0 px-5 py-2 bg-surface-container-high text-primary text-[10px] uppercase tracking-widest font-bold border border-primary/20 hover:bg-primary/5 transition-colors rounded-sm">
            Build Resume &rarr;
         </Link>
      </div>

      {/* Community Network Banner */}
      <div className="bg-surface-container border border-purple-500/20 rounded-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-purple-500/30 transition-colors">
         <div className="flex items-start gap-4">
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
               <Users className="size-4" />
            </div>
            <div className="space-y-0.5">
               <h3 className="font-headline text-base text-on-surface font-light">Professional Network</h3>
               <p className="text-secondary text-xs max-w-xl leading-relaxed">
                  2 mentors available · 4 community events this month · Licensed advisors, candidates, and employers in one ecosystem.
               </p>
            </div>
         </div>
         <Link href="/intelligence/career/network" className="shrink-0 px-5 py-2 bg-purple-500/10 text-purple-400 text-[10px] uppercase tracking-widest font-bold border border-purple-500/20 hover:bg-purple-500/20 transition-colors rounded-sm whitespace-nowrap">
            View Network &rarr;
         </Link>
      </div>

      {/* AI Coach Banner */}
      <div className="bg-surface-container border border-primary/20 rounded-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />
         <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 rounded bg-primary/10 border border-primary/20 text-primary mt-0.5">
               <Bot className="size-5" />
            </div>
            <div className="space-y-1">
               <div className="flex items-center gap-2">
                  <h3 className="font-headline text-lg text-on-surface font-light">AI Career Coach</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold text-primary border border-primary/30 bg-primary/5 rounded-sm">
                     <div className="size-1.5 rounded-full bg-primary animate-pulse" /> Active
                  </span>
               </div>
               <p className="text-secondary text-xs max-w-xl leading-relaxed">
                  14 sessions run · 6 of 8 goals met · Interview sim queued. Get predictive coaching, skill gap analysis, and mock interview practice calibrated to your Financial Advisor pathway.
               </p>
            </div>
         </div>
         <Link
            href="/intelligence/career/coach"
            className="relative z-10 shrink-0 px-6 py-2.5 bg-primary text-background text-[10px] uppercase tracking-widest font-bold hover:bg-primary-container transition-colors rounded-sm shadow-[0_0_15px_rgba(197,160,89,0.3)]"
         >
            Open Coach &rarr;
         </Link>
      </div>

      {/* Legal & Licensing Disclaimer */}
      <div className="pt-10 mb-8 border-t border-outline/30 flex items-start gap-4">
         <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
            <Award className="size-4" />
         </div>
         <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
            <strong className="text-slate-400">Regulatory Disclaimer:</strong> This framework provides career education and readiness support only. It is <span className="text-arcana-warning">not</span> investment, legal, tax, or licensing advice. All users must verify official licensing requirements, regulatory thresholds, and exam policies directly with FINRA, NASAA, their respective state insurance departments, their active employers, and certified training providers.
         </p>
      </div>
    </div>
  );
}
