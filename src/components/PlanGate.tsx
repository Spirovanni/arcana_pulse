"use client";

import { useRouter } from "next/navigation";
import { Lock, Zap } from "lucide-react";
import { usePlanGate } from "@/hooks/usePlanGate";
import type { WorkspacePlan } from "@/lib/types";

interface PlanGateProps {
  required: WorkspacePlan;
  featureName: string;
  children: React.ReactNode;
}

/**
 * Wraps a premium feature. Renders children when the workspace meets the
 * required plan; otherwise renders an upsell card.
 */
export default function PlanGate({ required, featureName, children }: PlanGateProps) {
  const { allowed } = usePlanGate(required);
  const router = useRouter();

  if (allowed) return <>{children}</>;

  return (
    <div className="rounded-sm border border-primary/20 bg-primary/5 p-8 flex flex-col items-center text-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[2px] text-on-surface mb-1">
          {featureName}
        </p>
        <p className="text-[11px] text-secondary max-w-xs">
          This feature is available on the{" "}
          <span className="text-primary font-bold capitalize">{required}</span> plan and above.
          Upgrade to unlock it.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/settings#billing")}
        className="btn-metallic px-6 py-2.5 text-[11px] font-black uppercase tracking-[2px] flex items-center gap-2"
      >
        <Zap className="w-3.5 h-3.5" />
        Upgrade Plan
      </button>
    </div>
  );
}
