import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
  textSize?: "sm" | "md" | "lg";
}

const textSizeClass: Record<NonNullable<BrandLogoProps["textSize"]>, string> = {
  sm: "text-sm tracking-[3px]",
  md: "text-lg tracking-[4px]",
  lg: "text-2xl tracking-[5px]",
};

export default function BrandLogo({
  className,
  markClassName,
  textClassName,
  showTagline = false,
  textSize = "md",
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn("size-6 text-primary", markClassName)}
      >
        <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="3.5" opacity="0.28" />
        <path
          d="M15 34c4 0 5-7 9-7s5 10 9 10 4-8 8-8 4 6 8 6h2"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="49" cy="35" r="3.5" fill="currentColor" />
      </svg>
      <div className="leading-none">
        <span
          className={cn(
            "block text-primary font-headline font-bold uppercase",
            textSizeClass[textSize],
            textClassName
          )}
        >
          Arcana Pulse
        </span>
        {showTagline ? (
          <span className="mt-1 block text-[9px] uppercase tracking-[2.5px] text-secondary">
            Sovereign Intelligence
          </span>
        ) : null}
      </div>
    </div>
  );
}
