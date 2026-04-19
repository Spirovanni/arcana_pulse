"use client";

import { useMemo } from "react";
import { Maximize2, Zap, Trophy, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const TRAJECTORY_DATA = [
  { year: "2026", baseline: 110000, optimized: 125000, milestone: "Senior IC" },
  { year: "2027", baseline: 115000, optimized: 155000, milestone: "Tech Lead Pivot" },
  { year: "2028", baseline: 121000, optimized: 180000, milestone: "System Architecture" },
  { year: "2029", baseline: 127000, optimized: 215000, milestone: "Principal / Manager" },
  { year: "2030", baseline: 135000, optimized: 245000, milestone: "Equity Compound" },
  { year: "2031", baseline: 142000, optimized: 280000, milestone: "Director Alignment" },
];

export default function CareerTrajectoryWidget() {
  const currentDelta = useMemo(() => {
    const last = TRAJECTORY_DATA[TRAJECTORY_DATA.length - 1];
    return last.optimized - last.baseline;
  }, []);

  return (
    <div className="bg-surface-container rounded-sm border border-outline relative overflow-hidden group">
      <div className="p-8 pb-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary text-[9px] uppercase tracking-[3px] border border-primary/20 rounded-sm shadow-[0_0_10px_rgba(197,160,89,0.1)]">
              <Zap className="size-3" /> AI Pathway Sync Active
            </div>
            <h3 className="font-headline text-2xl font-light text-on-surface leading-tight max-w-sm">
              Long-Term Asset Trajectory
            </h3>
            <p className="text-secondary text-xs tracking-wide">
              Comparing your un-optimized baseline against AI-targeted skill acquisitions over 6 years.
            </p>
          </div>
          
          <div className="space-y-1 text-right border-l border-outline/50 pl-6 shrink-0">
            <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">5-Yr Opportunity Cost</div>
            <div className="text-2xl font-light text-arcana-success drop-shadow-md">
              +{formatCurrency(currentDelta)}
            </div>
          </div>
        </div>

        {/* Milestone Tracker UI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 relative z-10">
          <div className="bg-background/40 border border-outline/40 p-4 rounded-sm hover:border-primary/30 transition-colors cursor-default">
            <h4 className="text-[9px] uppercase tracking-[2px] text-primary font-bold mb-1">Q3 2026</h4>
            <div className="text-xs text-on-surface font-medium truncate">System Design Masterclass</div>
            <div className="text-[10px] text-secondary mt-1 font-mono">+12% Earning Cap</div>
          </div>
          <div className="bg-background/40 border border-outline/40 p-4 rounded-sm hover:border-primary/30 transition-colors cursor-default">
            <h4 className="text-[9px] uppercase tracking-[2px] text-primary font-bold mb-1">Q1 2027</h4>
            <div className="text-xs text-on-surface font-medium truncate">Enterprise Arch Migration</div>
            <div className="text-[10px] text-secondary mt-1 font-mono">+25% Promotion Yield</div>
          </div>
          <div className="bg-background/40 border border-outline/40 p-4 rounded-sm hover:border-primary/30 transition-colors cursor-default border-dashed">
            <h4 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Q4 2028</h4>
            <div className="text-xs text-on-surface font-medium truncate flex items-center gap-1"><Trophy className="size-3"/> Principal Pivot</div>
            <div className="text-[10px] text-secondary mt-1 font-mono">+40% Base Yield</div>
          </div>
          <div className="bg-background/40 border border-outline/40 p-4 rounded-sm hover:border-primary/30 transition-colors cursor-default border-dashed">
             <div className="h-full flex items-center justify-center gap-2 text-[10px] text-secondary font-bold uppercase tracking-widest hover:text-primary transition-colors">
                 <Maximize2 className="size-3" /> Simulate Route
             </div>
          </div>
        </div>
      </div>

      <div className="h-72 w-full relative z-10 -ml-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TRAJECTORY_DATA} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="optGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4A4A4A" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2A2A2A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.2} />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-secondary)', fontSize: 10, fontWeight: 500 }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-secondary)', fontSize: 10, fontWeight: 500 }} 
              tickFormatter={(val) => `$${(val / 1000)}k`}
              dx={-5}
            />
            <Tooltip 
              cursor={{stroke: 'var(--color-outline-variant)', strokeWidth: 1, strokeDasharray: "3 3"}} 
              contentStyle={{ 
                backgroundColor: 'rgba(18, 18, 18, 0.9)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--color-primary-container)', 
                borderRadius: '4px',
                color: 'var(--color-on-surface)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }} 
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{ color: 'var(--color-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}
              formatter={(value: any, name: any) => [
                `$${Number(value).toLocaleString()}`, 
                name === "optimized" ? "AI Path" : "Status Quo"
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="baseline" 
              stroke="#666" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#baseGradient)" 
            />
            <Area 
              type="monotone" 
              dataKey="optimized" 
              stroke="var(--color-primary)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#optGradient)" 
              activeDot={{ r: 6, fill: "var(--color-background)", stroke: "var(--color-primary)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
