"use client";

export function notifyAiUsageUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("arcana:ai-usage-refresh"));
}
