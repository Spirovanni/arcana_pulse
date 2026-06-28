const ISSUER_DOMAIN_RULES: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /american\s*express|amex/i, domain: "americanexpress.com" },
  { pattern: /capital\s*one|cap\s*one/i, domain: "capitalone.com" },
  { pattern: /\bchase\b/i, domain: "chase.com" },
  { pattern: /\bciti\b|citibank/i, domain: "citi.com" },
  { pattern: /\bdiscover\b/i, domain: "discover.com" },
  { pattern: /wells\s*fargo/i, domain: "wellsfargo.com" },
  { pattern: /bank\s*of\s*america|\bbofa\b|\bboa\b/i, domain: "bankofamerica.com" },
  { pattern: /\busaa\b/i, domain: "usaa.com" },
  { pattern: /navy\s*federal/i, domain: "navyfederal.org" },
  { pattern: /\bpnc\b/i, domain: "pnc.com" },
  { pattern: /\bu\.?\s*s\.?\s*bank\b|\busbank\b/i, domain: "usbank.com" },
  { pattern: /\bbarclays\b/i, domain: "barclaysus.com" },
  { pattern: /\bsynchrony\b/i, domain: "synchrony.com" },
];

export function getIssuerLogoUrl(institutionName?: string): string | null {
  if (!institutionName) return null;
  const match = ISSUER_DOMAIN_RULES.find((rule) => rule.pattern.test(institutionName));
  if (!match) return null;
  return `https://logo.clearbit.com/${match.domain}`;
}
