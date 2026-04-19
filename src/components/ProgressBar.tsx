"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  colorClass?: string;
  className?: string;
}

/** Full progress bar with its own track wrapper. */
export default function ProgressBar({ value, colorClass = "bg-arcana-success", className }: ProgressBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fillRef.current?.style.setProperty("--w", `${value}%`); }, [value]);

  return (
    <div className={cn("w-full bg-outline/30 h-px relative", className)}>
      <div
        ref={fillRef}
        className={cn("absolute inset-y-0 left-0 h-[2px] -top-px transition-all [width:var(--w,0%)]", colorClass)}
      />
    </div>
  );
}

/** Fill-only element for use inside an existing positioned container. */
export function ProgressFill({ value, colorClass = "bg-arcana-success" }: { value: number; colorClass?: string }) {
  const fillRef = useRef<HTMLDivElement>(null);
  useEffect(() => { fillRef.current?.style.setProperty("--w", `${value}%`); }, [value]);

  return (
    <div
      ref={fillRef}
      className={cn("absolute inset-y-0 left-0 transition-all [width:var(--w,0%)]", colorClass)}
    />
  );
}
