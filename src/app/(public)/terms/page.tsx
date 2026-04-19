import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Arcana Pulse",
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    body: [
      "By creating an account or using Arcana Pulse (\"the Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, do not use the Service.",
      "We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms. We will provide at least 30 days notice of material changes.",
      "These Terms apply to all users, including visitors, registered users, and workspace administrators.",
    ],
  },
  {
    id: "description",
    title: "Description of Service",
    body: [
      "Arcana Pulse is a financial intelligence platform that aggregates transaction data, provides AI-driven financial analysis, supports bank account linking via Plaid, and enables fund transfers via Dwolla.",
      "The Service is provided for personal financial management and planning purposes. It is not a licensed financial advisor, broker-dealer, or investment advisor. Nothing in the Service constitutes professional financial, legal, or tax advice.",
      "We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: [
      "You must be at least 18 years old to use the Service.",
      "You must be a resident of a jurisdiction where the Service is legally available.",
      "By using the Service, you represent that you meet these eligibility requirements.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Security",
    body: [
      "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
      "You must notify us immediately of any unauthorized use of your account at security@arcanapulse.com.",
      "We recommend enabling Two-Factor Authentication (2FA) for additional account security.",
      "You may not share your account credentials with others or allow others to access your account.",
      "We reserve the right to suspend or terminate accounts that violate these Terms or that we determine are being used fraudulently.",
    ],
  },
  {
    id: "financial-data",
    title: "Financial Data & Third-Party Services",
    body: [
      "**Plaid** — Bank account linking is provided through Plaid Technologies, Inc. By linking a bank account, you agree to Plaid's End User Privacy Policy in addition to these Terms.",
      "**Dwolla** — Fund transfers are processed through Dwolla, Inc. By initiating a transfer, you agree to Dwolla's Terms of Service.",
      "You represent that all financial accounts you connect to the Service are accounts for which you are an authorized account holder.",
      "We display financial data for informational purposes. Always verify important financial information directly with your financial institution.",
    ],
  },
  {
    id: "ai-features",
    title: "AI Features & Limitations",
    body: [
      "AI-generated insights, budget recommendations, forecasts, and analyses are provided for informational purposes only. They do not constitute financial advice.",
      "AI outputs may be inaccurate, incomplete, or outdated. You should not make significant financial decisions based solely on AI-generated content.",
      "We continuously work to improve AI accuracy, but we make no warranty regarding the completeness, accuracy, or timeliness of AI-generated content.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    body: [
      "You may not use the Service for any illegal purpose or in violation of any applicable law or regulation.",
      "You may not attempt to access, tamper with, or disrupt the Service's infrastructure, security systems, or other users' accounts.",
      "You may not use automated systems to access the Service at a rate exceeding reasonable human usage.",
      "You may not use the Service to process transactions that are fraudulent, money-laundering related, or otherwise illegal.",
      "Violation of these acceptable use restrictions may result in immediate account termination.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    body: [
      "The Service, including its design, code, AI models, and content, is owned by Arcana Sovereign Intelligence Group and protected by intellectual property laws.",
      "You retain ownership of your financial data. By using the Service, you grant us a limited license to process your data to provide the Service.",
      "You may not reverse-engineer, decompile, or create derivative works based on the Service.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers & Limitation of Liability",
    body: [
      "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.",
      "WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.",
      "OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM USE OF THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.",
      "Some jurisdictions do not allow certain disclaimer or liability limitations; in those jurisdictions our liability is limited to the maximum extent permitted by law.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    body: [
      "You may terminate your account at any time through the Settings page or by contacting support@arcanapulse.com.",
      "We may suspend or terminate your account for violation of these Terms, fraudulent activity, or extended inactivity (with prior notice).",
      "Upon termination, your right to use the Service ceases. Your data will be handled per our Privacy Policy.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law & Disputes",
    body: [
      "These Terms are governed by the laws of the State of Delaware, without regard to conflict of law provisions.",
      "Any dispute arising from these Terms or the Service will be resolved through binding arbitration under the rules of the American Arbitration Association, except where prohibited by law.",
      "You waive the right to participate in class action lawsuits related to the Service.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "For questions about these Terms, contact us at legal@arcanapulse.com or by mail at: Arcana Sovereign Intelligence Group, Attn: Legal Team, [Address placeholder pending legal review].",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Nav */}
      <nav className="border-b border-outline/30 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-primary font-headline font-bold text-lg tracking-[4px] uppercase hover:opacity-80 transition-opacity">
          <Zap className="size-5" />
          Arcana
        </Link>
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest text-secondary">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
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
            <h1 className="text-4xl lg:text-5xl font-light tracking-tight">Terms of Service</h1>
            <p className="text-secondary text-sm">
              Effective date: <span className="text-on-surface">April 19, 2026</span> · Last updated: April 19, 2026
            </p>
            <p className="text-secondary leading-relaxed max-w-2xl">
              Please read these Terms carefully before using Arcana Pulse. By accessing or using our services, you agree to be bound by these Terms.
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
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="pt-8 border-t border-outline/40">
            <p className="text-xs text-secondary/50 uppercase tracking-widest">
              © 2026 Arcana Sovereign Intelligence Group · <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
