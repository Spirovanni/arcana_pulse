import { ArrowRight, Brain, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ScreenProps {
  onStart: () => void;
  onSeeIfYouQualify: () => void;
}

export default function LandingScreen({ onStart, onSeeIfYouQualify }: ScreenProps) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at top right, #d4af37 0%, transparent 40%), radial-gradient(circle at bottom left, #72dcff 0%, transparent 30%)' }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-outline-variant/10 shadow-xl bg-gradient-to-b from-[#131313] to-transparent">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-black tracking-tighter text-primary uppercase font-headline">Arcana</div>
          <div className="hidden md:flex space-x-8 items-center cursor-default">
            {['Analysis', 'Growth', 'Ledger', 'Pulse'].map((item) => (
              <span key={item} className="text-secondary font-medium hover:text-primary transition-colors duration-300">
                {item}
              </span>
            ))}
          </div>
          <div className="flex space-x-4 items-center">
            <button className="text-secondary font-medium hover:text-primary transition-colors hidden md:block">Login</button>
            <button 
              onClick={onSeeIfYouQualify}
              className="btn-metallic px-6 py-2 rounded-md font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
            >
              Begin Transformation
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 lg:px-8 max-w-7xl mx-auto min-h-screen flex flex-col justify-center flex-grow z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 space-y-8"
          >
            <span className="font-sans text-primary uppercase tracking-[4px] text-[10px] font-bold flex items-center gap-2 mb-4">
              <Brain className="size-4" />
              Sovereign Intelligence Engine
            </span>
            <h1 className="font-headline text-5xl lg:text-7xl font-light tracking-tight leading-tight text-on-surface">
              We Built an AI System That <span className="text-secondary italic">Helps You Take Control</span> of Your Money, Career, and Future — <span className="text-primary font-normal">In One Place.</span>
            </h1>
            <p className="font-sans text-secondary text-base lg:text-lg leading-relaxed max-w-2xl tracking-wide opacity-80">
              Stop reacting. Start commanding. The Arcana Pulse merges deep financial ledgers with career trajectory mapping, powered by sovereign AI that works exclusively for your growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onStart}
                className="btn-metallic px-8 py-4 rounded-md font-semibold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 ai-glow"
              >
                Start Your AI Interview
                <ArrowRight className="size-6" />
              </button>
              <button 
                onClick={onSeeIfYouQualify}
                className="bg-surface-container-highest border border-outline-variant/30 px-8 py-4 rounded-md font-semibold text-lg text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center"
              >
                See If You Qualify
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: -2 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="glass-panel rounded-xl p-2 border border-outline-variant/15 shadow-2xl relative">
              <img 
                src="https://picsum.photos/seed/arcana-dash/1200/900?blur=1" 
                alt="Dashboard Visualization" 
                className="rounded-lg w-full h-auto object-cover opacity-90 mix-blend-screen"
                referrerPolicy="no-referrer"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute -bottom-6 -left-6 glass-panel p-4 rounded-lg border border-outline-variant/15 shadow-2xl flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="text-primary size-5" />
                </div>
                <div>
                  <div className="text-[10px] text-secondary font-sans uppercase tracking-widest font-bold">Trajectory</div>
                  <div className="text-lg font-bold text-on-surface font-headline">+24% Optimization</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-[#0e0e0e] border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-lg font-black text-secondary font-headline uppercase tracking-tighter">Arcana</div>
          <div className="flex flex-wrap justify-center gap-6">
            {['Privacy Protocol', 'Terms of Sovereignty', 'Data Encryption', 'Career API'].map((item) => (
              <span key={item} className="font-sans text-[10px] uppercase tracking-widest text-secondary hover:text-tertiary transition-colors cursor-pointer opacity-60 hover:opacity-100">
                {item}
              </span>
            ))}
          </div>
          <div className="font-sans text-[10px] uppercase tracking-widest text-secondary opacity-60">
            © 2026 Arcana Sovereign Ledger. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
