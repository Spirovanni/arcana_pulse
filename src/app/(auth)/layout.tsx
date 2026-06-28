import BrandLogo from "@/components/BrandLogo";

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
        <div className="flex items-center justify-center mb-10">
          <BrandLogo markClassName="size-8" textSize="lg" />
        </div>
        {children}
      </div>
    </main>
  );
}
