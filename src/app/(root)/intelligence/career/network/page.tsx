"use client";

import { useState } from "react";
import { ArrowLeft, Users, UserCircle2, MapPin, Award, MessageSquare, Star, Search, Filter, Zap, BookOpen, Building2, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRole = "Licensed Advisor" | "Candidate" | "Mentor" | "Employer";
type ConnectionStatus = "connected" | "pending" | "none";

interface Member {
  id: number;
  name: string;
  role: MemberRole;
  title: string;
  firm: string;
  location: string;
  credentials: string[];
  specialties: string[];
  matchPct: number;
  connectionStatus: ConnectionStatus;
  mentorAvailable: boolean;
  bio: string;
}

interface Post {
  id: number;
  authorName: string;
  authorRole: MemberRole;
  authorTitle: string;
  timeAgo: string;
  body: string;
  topic: string;
  replies: number;
  reactions: number;
}

interface Event {
  id: number;
  title: string;
  host: string;
  date: string;
  format: "Webinar" | "In-Person" | "Workshop";
  topic: string;
  seats: number | null;
  registered: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
  {
    id: 1,
    name: "Diana Reyes",
    role: "Mentor",
    title: "Senior Financial Advisor",
    firm: "Meridian Wealth Partners",
    location: "Los Angeles, CA",
    credentials: ["CFP", "Series 7", "Series 66"],
    specialties: ["HNW Clients", "Retirement Planning", "Career Mentorship"],
    matchPct: 97,
    connectionStatus: "connected",
    mentorAvailable: true,
    bio: "15 years in wealth management. Passionate about growing diverse talent in financial advisory. Took the same Series 7 path — happy to walk you through it.",
  },
  {
    id: 2,
    name: "Marcus Webb",
    role: "Licensed Advisor",
    title: "Financial Advisor",
    firm: "Pacific Coast Advisory",
    location: "San Diego, CA",
    credentials: ["Series 7", "Series 63", "SIE"],
    specialties: ["First-Gen Clients", "Debt Elimination", "Asset Building"],
    matchPct: 91,
    connectionStatus: "pending",
    mentorAvailable: false,
    bio: "Career-switcher from social work. Series 63 took me 6 weeks on nights and weekends. Built my entire book through community referrals.",
  },
  {
    id: 3,
    name: "Aaliyah Torres",
    role: "Candidate",
    title: "Wealth Management Associate",
    firm: "First National Financial",
    location: "Los Angeles, CA",
    credentials: ["SIE", "Series 63 (In Progress)"],
    specialties: ["Client Onboarding", "Bilingual (Spanish/English)"],
    matchPct: 88,
    connectionStatus: "none",
    mentorAvailable: false,
    bio: "Month 6 of my Financial Advisor pathway. Working on Series 63. Would love to connect with others at this stage.",
  },
  {
    id: 4,
    name: "Jerome Washington",
    role: "Licensed Advisor",
    title: "Community Financial Navigator",
    firm: "Cerritos Community Credit Union",
    location: "Cerritos, CA",
    credentials: ["Series 65", "Life & Health License"],
    specialties: ["Credit Repair", "Community Banking", "Generational Wealth"],
    matchPct: 85,
    connectionStatus: "none",
    mentorAvailable: true,
    bio: "My practice is 100% community-focused. If you want to serve underbanked populations and build legacy wealth, let's connect.",
  },
  {
    id: 5,
    name: "Priya Nair",
    role: "Employer",
    title: "Branch Director, Recruiting",
    firm: "Arcadia Bancorp",
    location: "Pasadena, CA",
    credentials: [],
    specialties: ["Entry-Level Hiring", "Sponsorship Programs", "Diversity Recruiting"],
    matchPct: 79,
    connectionStatus: "none",
    mentorAvailable: false,
    bio: "We sponsor Series 7 and Series 63 for qualifying associates. Actively recruiting from the Arcana candidate pool. Reach out if you're pre-licensed.",
  },
];

const POSTS: Post[] = [
  {
    id: 1,
    authorName: "Diana Reyes",
    authorRole: "Mentor",
    authorTitle: "Senior Financial Advisor · Meridian Wealth",
    timeAgo: "3h ago",
    body: "Passed your Series 63? Don't wait to start Series 7 prep. The SIE gives you the foundation — momentum matters more than rest time. For anyone at this stage, I recommend front-loading the equity chapter.",
    topic: "Licensing",
    replies: 8,
    reactions: 24,
  },
  {
    id: 2,
    authorName: "Marcus Webb",
    authorRole: "Licensed Advisor",
    authorTitle: "Financial Advisor · Pacific Coast Advisory",
    timeAgo: "Yesterday",
    body: "Hot take: your first 50 clients don't come from your network. They come from being the most helpful person in every room you're in. Stop optimizing your pitch. Optimize your generosity.",
    topic: "Business Development",
    replies: 14,
    reactions: 41,
  },
  {
    id: 3,
    authorName: "Aaliyah Torres",
    authorRole: "Candidate",
    authorTitle: "WM Associate · First National Financial",
    timeAgo: "2 days ago",
    body: "Just hit 58% on my Series 63 readiness tracker. The Uniform Securities Act is a grind but I found that mapping the state-specific exemptions to real scenarios made it click. Anyone else using scenario mapping?",
    topic: "Exam Prep",
    replies: 6,
    reactions: 18,
  },
  {
    id: 4,
    authorName: "Jerome Washington",
    authorRole: "Licensed Advisor",
    authorTitle: "Community Financial Navigator · Cerritos CU",
    timeAgo: "3 days ago",
    body: "Reminder that a bilingual advisor in LA earns a 15–22% premium on market rates. If you speak Spanish, Tagalog, Mandarin, or Farsi — that's a competitive moat most wirehouse hires don't have. Lean into it.",
    topic: "Market Intelligence",
    replies: 11,
    reactions: 57,
  },
];

const EVENTS: Event[] = [
  {
    id: 1,
    title: "Series 7 Study Group — Week 3",
    host: "Diana Reyes",
    date: "Apr 23 · 7:00 PM",
    format: "Webinar",
    topic: "Equity Securities & Options",
    seats: 12,
    registered: true,
  },
  {
    id: 2,
    title: "Breaking Into Wealth Management",
    host: "Arcana Career Team",
    date: "Apr 26 · 10:00 AM",
    format: "Webinar",
    topic: "Career Transitions",
    seats: null,
    registered: false,
  },
  {
    id: 3,
    title: "Community Financial Advisor Meetup — LA",
    host: "Jerome Washington",
    date: "May 3 · 12:00 PM",
    format: "In-Person",
    topic: "Community Banking & Client Acquisition",
    seats: 20,
    registered: false,
  },
  {
    id: 4,
    title: "Resume Workshop: Financial Advisory Track",
    host: "Priya Nair · Arcadia Bancorp",
    date: "May 10 · 2:00 PM",
    format: "Workshop",
    topic: "Job Placement",
    seats: 8,
    registered: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<MemberRole, string> = {
  "Licensed Advisor": "text-teal-400 border-teal-400/30 bg-teal-400/5",
  Candidate:          "text-primary border-primary/30 bg-primary/5",
  Mentor:             "text-purple-400 border-purple-400/30 bg-purple-400/5",
  Employer:           "text-amber-400 border-amber-400/30 bg-amber-400/5",
};

const FORMAT_COLOR: Record<Event["format"], string> = {
  Webinar:    "text-teal-400 border-teal-400/30 bg-teal-400/5",
  "In-Person": "text-primary border-primary/30 bg-primary/5",
  Workshop:   "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-surface-container-high border border-outline/50 rounded-sm p-5 space-y-4 hover:border-outline transition-colors">
      <div className="flex items-start gap-4">
        <div className="size-10 bg-surface-container border border-outline rounded-full flex items-center justify-center shrink-0">
          <UserCircle2 className="size-6 text-secondary" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-on-surface font-medium">{member.name}</span>
            <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${ROLE_COLOR[member.role]}`}>
              {member.role}
            </span>
            {member.mentorAvailable && (
              <span className="text-[9px] uppercase font-bold tracking-widest border border-purple-400/30 text-purple-400 bg-purple-400/5 px-2 py-0.5 rounded-sm flex items-center gap-1">
                <Star className="size-2.5" /> Mentor
              </span>
            )}
          </div>
          <div className="text-[10px] text-secondary font-mono">{member.title} · {member.firm}</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <MapPin className="size-2.5" />{member.location}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-lg font-light font-mono ${member.matchPct >= 90 ? "text-arcana-success" : "text-primary"}`}>{member.matchPct}%</div>
          <div className="text-[8px] uppercase tracking-widest text-slate-500">Match</div>
        </div>
      </div>

      <p className="text-[11px] text-secondary leading-relaxed">{member.bio}</p>

      {member.credentials.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {member.credentials.map((c) => (
            <span key={c} className="text-[9px] font-mono border border-outline/40 text-slate-500 px-2 py-0.5 rounded-sm">{c}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {member.connectionStatus === "connected" ? (
          <span className="text-[9px] uppercase font-bold tracking-widest text-arcana-success border border-arcana-success/30 bg-arcana-success/5 px-3 py-1.5 rounded-sm">
            Connected
          </span>
        ) : member.connectionStatus === "pending" ? (
          <span className="text-[9px] uppercase font-bold tracking-widest text-secondary border border-outline/40 px-3 py-1.5 rounded-sm">
            Pending
          </span>
        ) : (
          <button className="text-[9px] uppercase font-bold tracking-widest text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-sm hover:bg-primary/10 transition-colors">
            Connect
          </button>
        )}
        {member.mentorAvailable && (
          <button className="text-[9px] uppercase font-bold tracking-widest text-purple-400 border border-purple-400/30 bg-purple-400/5 px-3 py-1.5 rounded-sm hover:bg-purple-400/10 transition-colors">
            Request Mentor Session
          </button>
        )}
      </div>
    </div>
  );
}

function FeedPost({ post }: { post: Post }) {
  return (
    <div className="bg-surface-container-high border border-outline/50 rounded-sm p-5 space-y-3 hover:border-outline transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-surface-container border border-outline rounded-full flex items-center justify-center shrink-0">
            <UserCircle2 className="size-5 text-secondary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface font-medium">{post.authorName}</span>
              <span className={`text-[9px] uppercase font-bold tracking-widest border px-1.5 py-0.5 rounded-sm ${ROLE_COLOR[post.authorRole]}`}>
                {post.authorRole}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{post.authorTitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] uppercase font-bold tracking-widest border border-outline/40 text-slate-500 px-2 py-0.5 rounded-sm">{post.topic}</span>
          <span className="text-[10px] text-slate-500 font-mono">{post.timeAgo}</span>
        </div>
      </div>

      <p className="text-xs text-secondary leading-relaxed">{post.body}</p>

      <div className="flex items-center gap-4 pt-1 border-t border-outline/20">
        <button className="inline-flex items-center gap-1.5 text-[10px] text-secondary hover:text-primary transition-colors font-mono">
          <MessageSquare className="size-3" />{post.replies} replies
        </button>
        <button className="inline-flex items-center gap-1.5 text-[10px] text-secondary hover:text-arcana-success transition-colors font-mono">
          <Star className="size-3" />{post.reactions}
        </button>
        <button className="ml-auto text-[9px] uppercase tracking-widest text-secondary hover:text-primary font-bold transition-colors">
          Reply
        </button>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <div className={`bg-surface-container-high border rounded-sm p-4 flex items-start gap-4 transition-colors ${event.registered ? "border-primary/20 bg-primary/3" : "border-outline/50 hover:border-outline"}`}>
      <div className={`p-2 rounded shrink-0 border ${FORMAT_COLOR[event.format]}`}>
        {event.format === "Webinar" && <Zap className="size-4" />}
        {event.format === "In-Person" && <Users className="size-4" />}
        {event.format === "Workshop" && <BookOpen className="size-4" />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-on-surface font-medium">{event.title}</span>
          {event.registered && (
            <span className="text-[9px] uppercase font-bold tracking-widest border border-primary/30 text-primary bg-primary/5 px-2 py-0.5 rounded-sm">Registered</span>
          )}
        </div>
        <div className="text-[10px] text-secondary font-mono">{event.host} · {event.date}</div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className={`text-[9px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded-sm ${FORMAT_COLOR[event.format]}`}>{event.format}</span>
          <span>{event.topic}</span>
          {event.seats !== null && <span>{event.seats} seats left</span>}
        </div>
      </div>
      {!event.registered && (
        <button className="shrink-0 text-[9px] uppercase font-bold tracking-widest text-primary border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-sm hover:bg-primary/10 transition-colors whitespace-nowrap">
          Register
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type NetworkTab = "members" | "feed" | "events";

const TABS: { id: NetworkTab; label: string; icon: React.ReactNode }[] = [
  { id: "members", label: "Members",    icon: <Users className="size-3.5" /> },
  { id: "feed",    label: "Community Feed", icon: <MessageSquare className="size-3.5" /> },
  { id: "events",  label: "Events",     icon: <Zap className="size-3.5" /> },
];

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<NetworkTab>("members");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");

  const filteredMembers = roleFilter === "all"
    ? MEMBERS
    : MEMBERS.filter(m => m.role === roleFilter);

  const connected = MEMBERS.filter(m => m.connectionStatus === "connected").length;
  const mentors = MEMBERS.filter(m => m.mentorAvailable).length;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 fade-in">
      {/* Header */}
      <header className="space-y-6">
        <Link href="/intelligence/career" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" /> Back to Advisor Academy
        </Link>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Users className="size-5" />
          </span>
          <h1 className="font-headline text-3xl font-light text-on-surface tracking-tight uppercase">Professional Network</h1>
        </div>
        <p className="text-secondary text-sm tracking-wide font-light max-w-xl leading-relaxed">
          Licensed advisors, career-switchers, mentors, and employers — all inside the Arcana ecosystem. Connect, learn, and get referred.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-purple-400/20 rounded-sm p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-400/5 pointer-events-none" />
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1 relative z-10">Network Size</div>
          <div className="text-2xl font-light text-purple-400 relative z-10">{MEMBERS.length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 relative z-10">suggested members</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Connected</div>
          <div className="text-2xl font-light text-arcana-success">{connected}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">active connections</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Mentors Available</div>
          <div className="text-2xl font-light text-on-surface">{mentors}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">in your cohort</div>
        </div>
        <div className="bg-surface-container border border-outline rounded-sm p-5">
          <div className="text-[9px] uppercase tracking-[2px] text-secondary font-bold mb-1">Events This Month</div>
          <div className="text-2xl font-light text-on-surface">{EVENTS.length}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">{EVENTS.filter(e => e.registered).length} registered</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline/30">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-secondary border-transparent hover:text-on-surface"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}

        {activeTab === "members" && (
          <div className="ml-auto flex items-center gap-1.5 pb-2">
            <Filter className="size-3 text-secondary" />
            {(["all", "Mentor", "Licensed Advisor", "Candidate", "Employer"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm border transition-colors ${
                  roleFilter === r
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-outline/40 text-secondary hover:border-outline"
                }`}
              >
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === "members" && filteredMembers.map(m => <MemberCard key={m.id} member={m} />)}
        {activeTab === "feed"    && POSTS.map(p => <FeedPost key={p.id} post={p} />)}
        {activeTab === "events"  && EVENTS.map(e => <EventCard key={e.id} event={e} />)}
      </div>

      {/* Cross-links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <Link href="/intelligence/career/placement" className="bg-surface-container border border-outline/50 rounded-sm p-4 flex items-center justify-between hover:border-teal-500/30 transition-colors group">
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-secondary group-hover:text-teal-400 transition-colors" />
            <div>
              <div className="text-xs text-on-surface font-medium">Job Placement Pipeline</div>
              <div className="text-[10px] text-slate-500">Firms in your network are hiring</div>
            </div>
          </div>
          <ChevronRight className="size-4 text-secondary group-hover:text-teal-400 transition-colors" />
        </Link>
        <Link href="/intelligence/career/coach" className="bg-surface-container border border-outline/50 rounded-sm p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
          <div className="flex items-center gap-3">
            <Award className="size-4 text-secondary group-hover:text-primary transition-colors" />
            <div>
              <div className="text-xs text-on-surface font-medium">AI Career Coach</div>
              <div className="text-[10px] text-slate-500">Prep for your next mentor session</div>
            </div>
          </div>
          <ChevronRight className="size-4 text-secondary group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="pt-6 border-t border-outline/30 flex items-start gap-4">
        <div className="p-1.5 rounded-sm bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-sm mt-1">
          <Users className="size-4" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 max-w-4xl tracking-wide uppercase">
          <strong className="text-slate-400">Community Disclaimer:</strong> Member profiles and community content are for professional networking and educational purposes only. Arcana Pulse does <span className="text-arcana-warning">not</span> guarantee employment or mentorship outcomes. Verify credentials and firm affiliations independently. Community posts do not constitute investment, legal, or licensing advice.
        </p>
      </div>
    </div>
  );
}
