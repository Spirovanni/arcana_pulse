import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="w-full py-3 text-center text-[9px] text-secondary font-sans uppercase tracking-[1.8px] border-t border-outline/40 mt-4 bg-background flex flex-wrap items-center justify-center gap-2">
      <BrandLogo textSize="sm" markClassName="size-3.5" />
      <span className="opacity-55">Intelligence for your next move</span>
      <span className="opacity-35">Sandbox Environment &middot; Not a regulated entity</span>
    </footer>
  );
}
