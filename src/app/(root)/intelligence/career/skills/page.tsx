"use client";

import { Award, ArrowLeft, GitMerge, FileCode2, Cpu, Database } from "lucide-react";
import Link from "next/link";

export default function SkillAcquisitionsPage() {
  const nodes = [
    { id: 1, title: "Client Service Operations", active: true, icon: FileCode2, impact: "+0%" },
    { id: 2, title: "FINRA Series 7 & 63", active: false, icon: Cpu, impact: "+18%" },
    { id: 3, title: "Fiduciary Wealth Architecture", active: false, icon: GitMerge, impact: "+25%" },
    { id: 4, title: "Macroeconomic Portfolio Mgt", active: false, icon: Database, impact: "+12%" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 fade-in">
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Advisor Academy
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <Award className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Skill Acquisitions</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          AI-generated curriculum pathways that directly correspond to mathematically verified increases in your global equity ceiling.
        </p>
      </header>

      <div className="bg-surface-container rounded-sm border border-outline p-8 md:p-12 relative overflow-hidden group min-h-[500px]">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 blur-3xl -mr-20 -mt-20 rounded-full transition-all group-hover:bg-teal-500/10 pointer-events-none" />
         
         <div className="max-w-3xl mx-auto relative z-10 space-y-8">
            <h2 className="text-xs text-secondary uppercase font-bold tracking-widest text-center mb-12">Dynamic Tech-Tree Resolution</h2>
            
            <div className="space-y-4 relative">
              {/* Connecting line */}
              <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-outline/40"></div>

              {nodes.map((node, i) => {
                const Icon = node.icon;
                return (
                  <div key={node.id} className={`flex items-center gap-6 p-4 rounded-md transition-all ${node.active ? 'bg-teal-500/5 border border-teal-500/20' : 'bg-surface/50 border border-outline/30 hover:border-outline'}`}>
                     <div className={`size-16 rounded flex-shrink-0 flex items-center justify-center relative z-10 ${node.active ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-surface-container border border-outline text-slate-500'}`}>
                        <Icon className="size-6" />
                     </div>
                     <div className="flex-1 flex justify-between items-center">
                        <div>
                          <h3 className={`text-lg font-headline ${node.active ? 'text-teal-400' : 'text-slate-300'}`}>{node.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                             {node.active ? 'Currently Mapped Capability' : 'Target Acquisition Node'}
                          </p>
                        </div>
                        <div className="text-right">
                           <div className={`text-xl font-light ${node.active ? 'text-slate-500' : 'text-arcana-success drop-shadow-md'}`}>{node.impact}</div>
                           <div className="text-[9px] uppercase tracking-widest text-secondary font-bold">Yield Factor</div>
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
               <button className="px-8 py-3 bg-teal-500/10 text-teal-400 text-xs uppercase tracking-widest font-bold hover:bg-teal-500/20 border border-teal-500/30 transition-colors rounded-sm shadow-[0_0_15px_rgba(20,184,166,0.1)]">
                 Generate Curriculum Routine
               </button>
               <Link href="/intelligence/career/roadmap" className="px-8 py-3 bg-primary/10 text-primary text-xs uppercase tracking-widest font-bold hover:bg-primary/20 border border-primary/30 transition-colors rounded-sm shadow-[0_0_15px_rgba(197,160,89,0.1)]">
                 View Full Roadmap &rarr;
               </Link>
            </div>
         </div>
      </div>
    </div>
  );
}
