import { ArrowLeft, ArrowRight, CheckCircle, GraduationCap, Building2, TrendingUp, Landmark } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface QuizProps {
  onNext: (stage: string) => void;
  onBack: () => void;
}

const STAGES = [
  { id: 'student', title: 'Student', icon: GraduationCap, desc: 'Currently pursuing education or recently graduated.' },
  { id: 'early', title: 'Early Career', icon: Building2, desc: '1-3 years of professional experience building foundation.' },
  { id: 'mid', title: 'Mid-Level', icon: TrendingUp, desc: 'Established professional driving sustained growth.' },
  { id: 'executive', title: 'Executive', icon: Landmark, desc: 'Leadership role directing strategy and operations.' },
];

export default function QuizScreen({ onNext, onBack }: QuizProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans antialiased flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-tertiary/5 blur-[150px]" />
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface-container-highest z-50 fixed top-0 left-0">
        <motion.div 
          className="h-full bg-primary shadow-[0_0_10px_rgba(242,202,80,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: '25%' }}
        />
      </div>

      <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-8 relative z-10 py-20">
        <div className="absolute top-8 left-8">
          <span className="font-headline font-black text-2xl tracking-tighter text-primary uppercase">Arcana</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full mx-auto space-y-12"
        >
          <div className="text-center space-y-4">
            <p className="font-sans text-[10px] text-primary tracking-[4px] uppercase font-bold">Step 1 of 4</p>
            <h1 className="font-headline text-4xl md:text-5xl font-light tracking-tight text-on-surface">
              What is your current career stage?
            </h1>
            <p className="font-sans text-base text-secondary max-w-xl mx-auto pt-2 opacity-70 tracking-wide">
              Select the stage that best represents your current professional standing. This calibrates the ledger's analytical depth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const isSelected = selected === stage.id;
              
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelected(stage.id)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center p-10 transition-all duration-500 rounded-sm overflow-hidden border",
                    isSelected 
                      ? "bg-surface-container border-primary shadow-[0_0_60px_rgba(197,160,89,0.05)]" 
                      : "bg-surface-container-low border-outline hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "absolute top-4 right-4 text-primary transition-opacity duration-300",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}>
                    <CheckCircle className="size-4" />
                  </div>
                  
                  <Icon className={cn(
                    "size-8 mb-6 transition-colors duration-500",
                    isSelected ? "text-primary" : "text-secondary group-hover:text-primary/70"
                  )} />
                  
                  <h3 className={cn(
                    "font-headline text-sm uppercase tracking-[2px] font-medium mb-2 relative z-10",
                    isSelected ? "text-primary" : "text-on-surface"
                  )}>
                    {stage.title}
                  </h3>
                  <p className="font-sans text-[11px] text-secondary text-center relative z-10 px-4 leading-relaxed tracking-wide">
                    {stage.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-16 pt-8 border-t border-surface-container">
            <button 
              onClick={onBack}
              className="font-sans text-sm font-bold text-secondary hover:text-on-surface transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <button 
              disabled={!selected}
              onClick={() => selected && onNext(selected)}
              className={cn(
                "font-headline font-bold text-sm px-8 py-3 rounded-md transition-all duration-300 flex items-center gap-2",
                selected 
                  ? "bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-[0_0_30px_rgba(242,202,80,0.3)] hover:scale-105" 
                  : "bg-surface-container-highest text-secondary cursor-not-allowed opacity-50"
              )}
            >
              Next
              <ArrowRight className="size-5" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
