import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({
  label = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 ${className}`}
    >
      <Loader2 className="w-8 h-8 text-arcana-blue animate-spin mb-3" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
