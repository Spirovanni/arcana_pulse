import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Arcana Pulse",
};

const SECTIONS = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    body: [
      "**Account information** — When you register, we collect your name, email address, and a hashed copy of your password. We never store your password in plaintext.",
      "**Financial data** — We collect transaction records, account balances, and bank linkage metadata you provide or authorize via Plaid. This data is used exclusively to power your financial dashboard and AI analysis.",
      "**Usage data** — We log page visits, feature interactions, and API requests to improve the product and detect abuse. Logs are retained for 90 days.",
      "**Device & network data** — IP address, browser user agent, and approximate geolocation (country/city level) are collected for security, rate limiting, and fraud prevention.",
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Your Information",
    body: [
      "To provide, maintain, and improve the Arcana Pulse platform and its AI-powered financial intelligence features.",
      "To authenticate your identity, protect your account from unauthorized access, and send security alerts.",
      "To generate AI-driven insights, forecasts, and budget recommendations — all processed server-side and never shared with third-party advertisers.",
      "To send transactional emails (verification, password reset, security alerts). We do not send marketing emails without explicit opt-in.",
      "To comply with legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    id: "data-sharing",
    title: "Data Sharing & Third Parties",
    body: [
      "**We do not sell your data.** We have no advertising business model and no financial incentive to share your personal or financial information with third parties.",
      "**Plaid** — We use Plaid to connect your bank accounts. Plaid has its own privacy policy and end-user agreement. Your bank credentials are never transmitted to or stored by Arcana.",
      "**Dwolla** — We use Dwolla to process fund transfers. Transaction data required for transfer processing is shared with Dwolla under their privacy policy.",
      "**Infrastructure providers** — We use Appwrite for database hosting and Sentry for error monitoring. These providers process data under data processing agreements with strict confidentiality obligations.",
      "**Legal requirements** — We may disclose information if required by law, court order, or to protect the rights, property, or safety of our users or the public.",
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    body: [
      "Your account and financial data is retained for the life of your account and up to 7 years after deletion, as required by financial regulations.",
      "Audit logs are retained for 2 years to support security reviews and compliance requirements.",
      "Usage logs and error reports are retained for 90 days.",
      "You may request deletion of your account and associated data at any time. Deletion requests are processed within 30 days, subject to legal retention requirements.",
    ],
  },
  {
    id: "your-rights",
    title: "Your Rights",
    body: [
      "**Access** — You may request a copy of all personal data we hold about you.",
      "**Correction** — You may request correction of inaccurate or incomplete data.",
      "**Deletion** — You may request deletion of your account and data, subject to legal retention obligations.",
      "**Portability** — You may export your transaction data in CSV format at any time from the Transactions page.",
      "**Opt-out** — You may opt out of non-essential communications at any time.",
      "California residents have additional rights under CCPA. EU/UK residents have additional rights under GDPR. To exercise any of these rights, contact us at privacy@arcanapulse.com.",
    ],
  },
  {
    id: "security",
    title: "Security",
    body: [
      "We use AES-256-GCM encryption for sensitive fields at rest. All data in transit is encrypted using TLS 1.3.",
      "Passwords are hashed with bcrypt (cost factor 12) before storage. We never store plaintext credentials.",
      "Multi-factor authentication (TOTP) is available and encouraged for all accounts.",
      "We conduct regular security reviews and maintain an audit log of all sensitive operations.",
      "Despite these measures, no system is perfectly secure. We will notify affected users promptly in the event of a data breach.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies & Local Storage",
    body: [
      "**Essential cookies** — We use session cookies to maintain your authenticated state. These are strictly necessary and cannot be disabled.",
      "**Preference cookies** — We store UI preferences (theme, filters) in localStorage. These contain no personal data.",
      "**Analytics** — We do not use third-party analytics cookies (e.g., Google Analytics). Any analytics we perform are server-side and privacy-preserving.",
      "You can clear cookies and localStorage at any time through your browser settings. Clearing session cookies will log you out.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. We will notify you of material changes via email and by displaying a notice in the application at least 30 days before changes take effect.",
      "Continued use of Arcana Pulse after changes take effect constitutes acceptance of the updated policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "For privacy-related questions, requests, or concerns, contact us at privacy@arcanapulse.com or by mail at: Arcana Sovereign Intelligence Group, Attn: Privacy Team, [Address placeholder pending legal review].",
    ],
  },
];

function renderBody(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-on-surface font-medium">{part}</strong> : part
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Nav */}
      <nav className="border-b border-outline/30 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-primary font-headline font-bold text-lg tracking-[4px] uppercase hover:opacity-80 transition-opacity">
          <Zap className="size-5" />
          Arcana
        </Link>
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest text-secondary">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <Link href="/sign-in" className="hover:text-primary transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-16">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-10 space-y-1">
            <p className="text-[9px] uppercase tracking-[3px] text-secondary font-bold mb-4">Contents</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-xs text-secondary/60 hover:text-primary transition-colors py-1 leading-snug"
              >
                {s.title}
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-12 min-w-0">
          <div className="space-y-3 pb-8 border-b border-outline/40">
            <span className="text-[9px] uppercase tracking-[3px] text-primary font-bold">Legal</span>
            <h1 className="text-4xl lg:text-5xl font-light tracking-tight">Privacy Policy</h1>
            <p className="text-secondary text-sm">
              Effective date: <span className="text-on-surface">April 19, 2026</span> · Last updated: April 19, 2026
            </p>
            <p className="text-secondary leading-relaxed max-w-2xl">
              Arcana Pulse is committed to protecting your privacy. This policy explains what data we collect, why we collect it, how it's used, and the rights you have over your information.
            </p>
          </div>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="space-y-4 scroll-mt-8">
              <h2 className="text-xl font-light text-on-surface tracking-tight border-l-2 border-primary pl-4">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.body.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-secondary leading-relaxed">
                    <span className="text-primary mt-1.5 flex-shrink-0">—</span>
                    <span>{renderBody(item)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="pt-8 border-t border-outline/40">
            <p className="text-xs text-secondary/50 uppercase tracking-widest">
              © 2026 Arcana Sovereign Intelligence Group · <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
