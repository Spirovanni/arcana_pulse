export type UsageSummaryInput = {
  tokenLimit: number | null;
  tokensUsed: number;
  tokensRemaining: number | null;
};

export function formatTokenSummary(usage: UsageSummaryInput): string {
  if (usage.tokenLimit == null) {
    return `${usage.tokensUsed.toLocaleString()} tokens used`;
  }
  return `${Math.max(0, usage.tokensRemaining ?? 0).toLocaleString()} tokens left`;
}
