import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="w-full py-8 text-center text-[10px] text-secondary font-sans uppercase tracking-widest border-t border-outline/50 mt-12 bg-background flex flex-col items-center gap-2">
      <BrandLogo textSize="sm" markClassName="size-4" />
      <span className="opacity-60">Arcana Sovereign Intelligence Group</span>
      <span className="opacity-40">&middot; Sandbox Environment &middot; Not a regulated entity</span>
    </footer>
  );
}
