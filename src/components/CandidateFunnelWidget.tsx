"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Candidate, PipelineStatus } from "@/lib/types";
import { Users, MoreHorizontal, UserCircle2 } from "lucide-react";

export function CandidateFunnelWidget({ candidates }: { candidates: Candidate[] }) {
  const columns = useMemo(() => {
    const cols: Record<PipelineStatus, Candidate[]> = {
      sourced: [],
      interviewing: [],
      offer_pending: [],
      hired: [],
      rejected: [],
    };
    candidates.forEach((c) => {
      if (cols[c.status]) cols[c.status].push(c);
    });
    return cols;
  }, [candidates]);

  const activeColumns: { id: PipelineStatus; name: string }[] = [
    { id: "sourced", name: "Sourced" },
    { id: "interviewing", name: "Interviewing" },
    { id: "offer_pending", name: "Offer Pending" },
  ];

  return (
    <div className="bg-surface-container rounded-lg border border-outline/50 p-6 shadow-sm ring-1 ring-white/5 flex flex-col h-full bg-gradient-to-b from-surface-container to-surface-container-high/20">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline/30">
        <h3 className="text-lg font-headline font-medium text-slate-100 flex items-center gap-2">
          <Users className="size-5 text-arcana-sky" />
          Candidate Pipeline
        </h3>
        <button className="text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors uppercase tracking-widest font-bold">
          View All
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
        {activeColumns.map((col) => (
          <div key={col.id} className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-slate-400 px-2">
              <span>{col.name}</span>
              <span className="bg-surface border border-outline px-2 py-0.5 rounded-full">{columns[col.id].length}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {columns[col.id].map((candidate) => (
                <div key={candidate.candidateId} className="bg-surface border border-outline/50 p-4 rounded-md shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <div className="flex flex-row justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {candidate.avatarUrl ? (
                         <div className="relative size-8 rounded-full overflow-hidden border border-outline">
                           <Image src={candidate.avatarUrl} alt={candidate.firstName} fill className="object-cover" />
                         </div>
                      ) : (
                         <UserCircle2 className="size-8 text-slate-500" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-200">{candidate.firstName} {candidate.lastName}</span>
                        <span className="text-xs text-slate-500">{candidate.targetRole}</span>
                      </div>
                    </div>
                    <button className="text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-outline/30 text-xs">
                     <span className="text-slate-400 font-mono tracking-wider">MATCH SCORE</span>
                     <span className={`font-medium ${candidate.matchScore > 90 ? 'text-arcana-success' : 'text-arcana-warning'}`}>{candidate.matchScore}%</span>
                  </div>
                </div>
              ))}
              
              {columns[col.id].length === 0 && (
                <div className="border border-dashed border-outline/40 rounded-md p-6 flex items-center justify-center text-xs text-slate-500">
                  No candidates active
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
