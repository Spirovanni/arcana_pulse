"use client";

import { Target, Compass, Briefcase, Award, GraduationCap } from "lucide-react";
import CareerTrajectoryWidget from "@/components/CareerTrajectoryWidget";
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
            <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Career Trajectory</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
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

         {/* Node 2 */}
         <div className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-teal-500/10" />
            <div className="size-10 bg-teal-500/10 border border-teal-500/20 rounded flex items-center justify-center mb-6">
               <Award className="size-5 text-teal-400" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Skill Acquisitions</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
               Acquiring your FINRA Series 7 directly unlocks fiduciary architectural positioning, scaling your total advisory equity ceiling by a factor of 1.8x.
            </p>
            <Link href="/intelligence/career/skills" className="inline-block text-[10px] uppercase font-bold tracking-widest text-teal-400 hover:text-teal-300 transition-colors">
               View Curriculum &rarr;
            </Link>
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
