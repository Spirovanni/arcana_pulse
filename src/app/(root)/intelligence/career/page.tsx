"use client";

import { Target, Compass, Briefcase, Award, GraduationCap } from "lucide-react";
import CareerTrajectoryWidget from "@/components/CareerTrajectoryWidget";

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
              Your structural skills map indicates a 14% delta between your current compensation and the median market leverage for equivalent engineering scope.
            </p>
            <div className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary-container cursor-pointer transition-colors">
               Analyze Gap &rarr;
            </div>
         </div>

         {/* Node 2 */}
         <div className="bg-surface-container-high border border-outline rounded-sm p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl -mr-10 -mt-10 rounded-full transition-all group-hover:bg-teal-500/10" />
            <div className="size-10 bg-teal-500/10 border border-teal-500/20 rounded flex items-center justify-center mb-6">
               <Award className="size-5 text-teal-400" />
            </div>
            <h4 className="text-on-surface font-headline font-medium text-lg mb-2">Skill Acquisitions</h4>
            <p className="text-secondary text-xs leading-relaxed mb-4">
               Migrating from procedural legacy to cloud-first Distributed Architectures scales your equity ceiling by a factor of 1.8x.
            </p>
            <div className="text-[10px] uppercase font-bold tracking-widest text-teal-400 hover:text-teal-300 cursor-pointer transition-colors">
               View Curriculum &rarr;
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
            <div className="text-[10px] uppercase font-bold tracking-widest text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">
               View Scenarios &rarr;
            </div>
         </div>
      </div>
    </div>
  );
}
