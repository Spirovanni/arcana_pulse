import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-on-surface">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at top, #d4af37 0%, transparent 40%)' }} />
      <div className="w-full max-w-md px-6 z-10">
        <div className="flex items-center justify-center gap-3 mb-10 text-primary font-headline font-bold text-2xl tracking-[4px] uppercase">
          <Zap className="size-8" />
          <span>Arcana</span>
        </div>
        {children}
      </div>
    </main>
  );
}
