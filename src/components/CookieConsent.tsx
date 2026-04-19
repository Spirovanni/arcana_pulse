"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "arcana_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[9999] flex justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-xl w-full glass-panel border border-outline/40 rounded-sm p-5 shadow-2xl flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-sm flex-shrink-0 mt-0.5">
          <Cookie className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-on-surface font-medium mb-1">
            We use essential cookies to keep you signed in.
          </p>
          <p className="text-[11px] text-secondary leading-relaxed">
            No tracking or advertising cookies. Read our{" "}
            <Link href="/privacy#cookies" className="text-primary hover:underline">
              cookie policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={accept}
            className="btn-metallic px-4 py-2 text-[10px] uppercase tracking-[1px] font-bold"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-1.5 text-secondary/50 hover:text-secondary transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
