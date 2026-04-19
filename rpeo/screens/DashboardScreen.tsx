import { 
  BarChart2, 
  TrendingUp, 
  Landmark, 
  Brain, 
  Settings, 
  HelpCircle, 
  ArrowRight, 
  Bell, 
  MoreHorizontal,
  Zap,
  LayoutDashboard,
  Wallet,
  Globe,
  Cpu
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { cn } from '../lib/utils';

const CHART_DATA = [
  { val: 30 }, { val: 45 }, { val: 40 }, { val: 60 }, { val: 55 }, { val: 75 }, { val: 90 }
];

const VECTORS = [
  { id: 1, title: 'Equity Diversification', icon: Wallet, phase: 'Phase 2', progress: 45, desc: 'Rebalancing portfolio away from legacy tech towards sovereign infrastructure.', color: 'primary' },
  { id: 2, title: 'Global Market Presence', icon: Globe, phase: 'Phase 1', progress: 15, desc: 'Expanding thought leadership footprint in European fintech sectors.', color: 'tertiary' },
  { id: 3, title: 'System Architecture', icon: Cpu, phase: 'Phase 4', progress: 80, desc: 'Upgrading core skill stack to align with next-gen ledger technologies.', color: 'primary' },
];

export default function DashboardScreen() {
  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden">
      {/* Sidebar */}
      <nav className="hidden lg:flex w-[260px] flex-col bg-background border-r border-outline py-12 px-8 z-40">
        <div className="mb-12">
          <h2 className="text-primary font-headline font-bold text-lg tracking-[4px] uppercase">Arcana</h2>
        </div>

        <div className="flex-1 space-y-4">
          {[
            { label: 'Overview', icon: BarChart2, active: true },
            { label: 'Portfolio', icon: Landmark },
            { label: 'Intelligence', icon: Brain },
            { label: 'Transactions', icon: TrendingUp },
          ].map((item) => (
            <button 
              key={item.label}
              className={cn(
                "w-full flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-left",
                item.active 
                  ? "text-on-surface border-l-2 border-primary pl-4 -ml-[34px]" 
                  : "text-secondary hover:text-on-surface pl-0"
              )}
            >
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-outline/50">
          <div className="text-[10px] text-secondary/60 leading-relaxed tracking-wider">
            © 2026 Arcana Sovereign<br />Intelligence Group
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto bg-surface relative z-10 p-10 lg:p-16">
        <div className="max-w-7xl mx-auto space-y-12 pb-20">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <h1 className="font-headline text-4xl lg:text-5xl font-light tracking-tight text-on-surface">Portfolio Summary</h1>
              <p className="text-secondary text-sm tracking-wide font-light">Welcome back. Your sovereign assets are performing above benchmark.</p>
            </div>
            <div className="flex items-center gap-12">
              <div className="space-y-1 text-right">
                <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Total Value</div>
                <div className="text-2xl font-light text-primary">$42.8M</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">YTD Return</div>
                <div className="text-2xl font-light text-primary">+14.2%</div>
              </div>
            </div>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Metric Card */}
            <div className="lg:col-span-8 bg-surface-container rounded-sm p-10 border border-outline relative overflow-hidden group">
              <div className="absolute -right-20 -bottom-20 size-80 border border-primary/5 rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 bg-primary/5 text-primary text-[9px] uppercase tracking-[3px] border border-primary/10 rounded-sm">Featured Opportunity</div>
                  <h3 className="font-headline text-3xl font-light text-on-surface leading-tight max-w-sm">The Sovereign Estate & Private Gardens</h3>
                </div>
                <button className="px-6 py-2 border border-primary/30 text-primary text-[10px] uppercase tracking-[2px] hover:bg-primary hover:text-background transition-all">
                  View Strategy
                </button>
              </div>

              <div className="h-40 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CHART_DATA}>
                    <Bar dataKey="val">
                      {CHART_DATA.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === CHART_DATA.length - 1 ? '#C5A059' : '#1A1A1A'} 
                          className="hover:fill-primary/70 transition-colors"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alignment Score Card */}
            <div className="lg:col-span-4 bg-surface-container rounded-sm p-10 border border-outline flex flex-col justify-between">
              <div className="space-y-8">
                <h3 className="text-[9px] uppercase tracking-[2px] text-secondary font-bold">Model Alignment</h3>
                <div className="flex items-center gap-8">
                  <div className="relative size-24 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#1A1A1A" strokeWidth="2" />
                      <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="#C5A059" strokeWidth="2" 
                        strokeDasharray="282.6" strokeDashoffset="33.9" strokeLinecap="square"
                      />
                    </svg>
                    <span className="absolute font-headline text-3xl font-light text-on-surface">88</span>
                  </div>
                  <p className="text-xs text-secondary font-light leading-relaxed tracking-wide">Strategic alignment with core intelligence parameters.</p>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-outline/50">
                <div className="flex justify-between items-center text-[9px] uppercase tracking-widest mb-4">
                  <span className="text-secondary font-bold">Process Velocity</span>
                  <span className="text-primary font-bold">92%</span>
                </div>
                <div className="w-full bg-outline/20 h-px">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '92%' }}
                    transition={{ duration: 1.5 }}
                    className="bg-primary h-px" 
                  />
                </div>
              </div>
            </div>

            {/* Active Vectors */}
            <div className="lg:col-span-12 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {VECTORS.map((vector) => (
                  <motion.div 
                    key={vector.id}
                    className="bg-surface-container p-8 border border-outline hover:border-primary/40 transition-all duration-500 rounded-sm space-y-8"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm text-on-surface tracking-wide">{vector.title}</h4>
                        <div className="text-[9px] uppercase tracking-wider text-secondary/60">{vector.phase}</div>
                      </div>
                      <vector.icon className="size-4 text-secondary/30" />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-[10px] text-primary font-bold">Value: $12.4M</div>
                      <div className="w-full bg-outline/20 h-px">
                        <motion.div 
                          className="bg-primary h-px"
                          initial={{ width: 0 }}
                          animate={{ width: `${vector.progress}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
