import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
  textSize?: "sm" | "md" | "lg";
}

const textSizeClass: Record<NonNullable<BrandLogoProps["textSize"]>, string> = {
  sm: "text-sm tracking-[4px]",
  md: "text-lg tracking-[5px]",
  lg: "text-2xl tracking-[6px]",
};

export default function BrandLogo({
  className,
  markClassName,
  textClassName,
  showTagline = false,
  textSize = "md",
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn("size-6 text-primary", markClassName)}
      >
        <path
          d="M8 33a24 24 0 0 1 48 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M56 37a24 24 0 0 1-48 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M20 47 31.5 18 41 37h15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 34h11l3.6 6.2 4.4-12.2 3.2 9.6 2.7-6.8 2.2 3.2H54"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 30.2l1.8 2.8 3.2.7-2.1 2.4.2 3.2-3.1-1.3-3.1 1.3.2-3.2-2.1-2.4 3.2-.7 1.8-2.8z"
          fill="currentColor"
        />
      </svg>
      <div className="leading-none">
        <span
          className={cn(
            "block text-primary font-headline font-semibold uppercase",
            textSizeClass[textSize],
            textClassName
          )}
        >
          ARCANA PULSE
        </span>
        {showTagline ? (
          <span className="mt-1 block text-[9px] uppercase tracking-[2.6px] text-secondary">
            Intelligence for your next move
          </span>
        ) : null}
      </div>
    </div>
  );
}
