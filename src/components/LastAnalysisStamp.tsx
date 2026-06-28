"use client";

interface LastAnalysisStampProps {
  lastAnalysisAt: string | null;
  className?: string;
}

export default function LastAnalysisStamp({
  lastAnalysisAt,
  className,
}: LastAnalysisStampProps) {
  return (
    <span className={className ?? "text-[9px] uppercase tracking-[1.5px] text-secondary"}>
      Last analysis:{" "}
      {lastAnalysisAt ? new Date(lastAnalysisAt).toLocaleString() : "Not run yet"}
    </span>
  );
}
