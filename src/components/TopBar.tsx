"use client";

import { useSession } from "next-auth/react";
import { UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { formatTokenSummary } from "@/lib/aiUsageDisplay";

export default function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;

  // Derive these before hooks so we can pass them as initial/dep values
  const primaryImageUrl = user?.imageUrl;
  const fallbackImageUrl = user?.image;
  const fullName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName}`.trim() : "");

  // Hooks must always be called unconditionally — before any early return
  const [imgSrc, setImgSrc] = useState<string | undefined>(primaryImageUrl || fallbackImageUrl);
  const [tokenSummary, setTokenSummary] = useState<string>("...");

  useEffect(() => {
    setImgSrc(primaryImageUrl || fallbackImageUrl);
  }, [primaryImageUrl, fallbackImageUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadUsage = async () => {
      try {
        const res = await fetch("/api/ai/usage");
        if (!res.ok) return;
        const data = await res.json();
        const usage = data.usage as
          | {
              tokenLimit: number | null;
              tokensUsed: number;
              tokensRemaining: number | null;
            }
          | undefined;
        if (!usage || cancelled) return;

        setTokenSummary(formatTokenSummary(usage));
      } catch {
        // non-critical, keep top bar lean
      }
    };

    void loadUsage();
    const onFocus = () => {
      void loadUsage();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  if (!user) return null;

  return (
    <div className="hidden lg:flex items-center justify-end px-10 py-4 border-b border-outline/30 bg-surface sticky top-0 z-30">
      <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
        <div className="relative size-8 rounded-full overflow-hidden border border-outline/60 shrink-0">
          {imgSrc ? (
            <img 
              src={imgSrc} 
              alt={fullName} 
              className="size-full object-cover" 
              referrerPolicy="no-referrer"
              onError={() => {
                if (imgSrc === primaryImageUrl && fallbackImageUrl && primaryImageUrl !== fallbackImageUrl) {
                  setImgSrc(fallbackImageUrl);
                } else {
                  setImgSrc(undefined);
                }
              }}
            />
          ) : (
            <div className="size-full bg-primary/10 flex items-center justify-center">
              <UserCircle2 className="size-5 text-primary" />
            </div>
          )}
        </div>
        <span className="flex flex-col leading-tight">
          <span className="text-sm text-on-surface font-medium tracking-wide group-hover:text-primary transition-colors">
            {fullName}
          </span>
          <span className="text-[10px] uppercase tracking-[1.2px] text-secondary">
            {tokenSummary}
          </span>
        </span>
      </Link>
    </div>
  );
}
