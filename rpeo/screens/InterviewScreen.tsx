import { ArrowRight, Lock, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';

interface InterviewProps {
  onComplete: (answer: string) => void;
}

export default function InterviewScreen({ onComplete }: InterviewProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // In a real app we'd call Gemini here to personalize the experience
      // For now we simulate a response then move to dashboard
      await new Promise(r => setTimeout(r, 1500));
      onComplete(input);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex flex-col relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tertiary/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center mb-16 text-center space-y-10"
        >
          {/* Avatar Area */}
          <div className="relative group">
            <div className="absolute inset-0 bg-tertiary blur-3xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-1000 animate-pulse" />
            <div className="w-24 h-24 rounded-full overflow-hidden border border-outline-variant/30 relative z-10 bg-surface-container-highest shadow-2xl">
              <img 
                src="https://picsum.photos/seed/arcana-ai/400/400" 
                alt="Arcana AI" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Pulsing Status Dot */}
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-tertiary rounded-full border-2 border-background z-20 shadow-[0_0_15px_#72dcff] animate-pulse" />
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.h1 
                key="greeting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-headline text-4xl md:text-5xl lg:text-5xl font-light tracking-tight text-on-surface leading-tight"
              >
                Hello, I am <span className="gold-gradient-text uppercase tracking-widest font-normal">Arcana</span>.
              </motion.h1>
            </AnimatePresence>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-headline text-lg md:text-xl text-secondary font-light tracking-[4px] uppercase"
            >
              System Initialization Complete
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="font-sans text-base md:text-lg text-on-surface-variant max-w-xl mx-auto leading-relaxed tracking-wide opacity-80"
            >
              "What is one thing you would change about your career right now?"
            </motion.p>
          </div>
        </motion.div>

        {/* Input Block */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="w-full max-w-2xl bg-surface-container rounded-sm border border-outline p-0 shadow-2xl focus-within:border-primary/40 transition-all duration-500"
        >
          <div className="bg-transparent p-8 space-y-6">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your command..."
              className="w-full bg-transparent border-none text-on-surface font-sans text-lg placeholder:text-secondary/30 focus:ring-0 resize-none min-h-[120px] leading-relaxed tracking-wide font-light"
              spellCheck={false}
              autoFocus
            />
            
            <div className="flex justify-between items-center pt-4 border-t border-outline/30">
              <div className="flex items-center gap-3 text-secondary/40">
                <Mic className="size-4 opacity-50" />
                <span className="font-sans text-[9px] uppercase tracking-[3px] font-bold">Encrypted Input</span>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                className={cn(
                  "px-8 py-3 rounded-sm font-headline font-light uppercase tracking-[2px] text-xs transition-all duration-500",
                  input.trim() 
                    ? "btn-metallic border-primary/50" 
                    : "bg-surface-container-highest text-secondary opacity-30 cursor-not-allowed"
                )}
              >
                {isSubmitting ? 'Processing' : 'Confirm'}
                {!isSubmitting && <ArrowRight className="size-3 ml-2" />}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-12 text-center"
        >
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-secondary opacity-50 flex items-center gap-2 justify-center">
            <Lock className="size-3" />
            End-to-End Encrypted Sovereign Session
          </span>
        </motion.div>
      </main>
    </div>
  );
}
