"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  SendHorizontal,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  BarChart2,
  Wallet,
  Target,
  Brain,
  CreditCard,
  Bot,
  BookMarked,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import BrandLogo from "@/components/BrandLogo";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  SendHorizontal,
  MessageCircle,
  Bell,
  Settings,
  BarChart2,
  Wallet,
  Target,
  Brain,
  CreditCard,
  Bot,
  BookMarked,
  Shield,
  FolderTree,
};

const NAV_SECTIONS: Array<{ id: string; label: string; hrefs: string[] }> = [
  {
    id: "overview",
    label: "Overview",
    hrefs: ["/dashboard", "/assistant", "/notifications"],
  },
  {
    id: "banking",
    label: "Banking & Cashflow",
    hrefs: ["/my-banks", "/transactions", "/income", "/expense", "/transfer", "/budgets", "/goals"],
  },
  {
    id: "investing",
    label: "Investing",
    hrefs: ["/portfolio", "/algo-strategies"],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    hrefs: ["/intelligence/career", "/resources"],
  },
  {
    id: "account",
    label: "Account",
    hrefs: ["/pricing", "/settings", "/admin"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    banking: true,
    investing: true,
    intelligence: true,
    account: true,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("arcana.sidebar.collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("arcana.sidebar.collapsed", collapsed ? "true" : "false");
  }, [collapsed]);
  useEffect(() => {
    const saved = window.localStorage.getItem("arcana.sidebar.sections");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        setExpandedSections((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore invalid local storage payloads
      }
    }
  }, []);
  useEffect(() => {
    window.localStorage.setItem("arcana.sidebar.sections", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const navByHref = Object.fromEntries(NAV_ITEMS.map((item) => [item.href, item]));
  const sectionItems = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.hrefs
      .map((href) => navByHref[href])
      .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item)),
  }));

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-background border-r border-outline py-8 z-40 h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-[92px] px-4" : "w-[260px] px-8"
      )}
    >
      {/* Brand */}
      <div className="mb-8 flex items-center justify-between">
      <Link href="/" className="block group">
        <BrandLogo
          className="group-hover:opacity-80 transition-opacity"
          markClassName="size-5"
          textClassName={cn("text-lg tracking-[4px]", collapsed && "hidden")}
          showTagline={!collapsed}
        />
      </Link>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="p-2 rounded-sm border border-outline/60 text-secondary hover:text-on-surface hover:border-primary/40 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-3 overflow-y-auto pr-1">
        {(collapsed ? [{ id: "all", label: "All", items: NAV_ITEMS }] : sectionItems).map((section) => {
          const isExpanded = collapsed ? true : (expandedSections[section.id] ?? true);
          const hasActiveItem = section.items.some(
            (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          );

          return (
            <div key={section.id} className="space-y-1">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      [section.id]: !(prev[section.id] ?? true),
                    }))
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 text-[9px] uppercase tracking-[2px] font-bold transition-colors rounded-sm",
                    hasActiveItem ? "text-primary bg-primary/5" : "text-secondary/70 hover:text-secondary"
                  )}
                >
                  <span>{section.label}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {isExpanded && (
                <div className={cn(!collapsed && "pl-2 border-l border-outline/40 ml-2 space-y-1 py-1")}>
                  {section.items.map((item) => {
                    const Icon = ICON_MAP[item.icon];
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "w-full flex items-center text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-left",
                          collapsed ? "gap-0 justify-center px-2 py-2 rounded-sm" : "gap-3 px-2 py-2 rounded-sm",
                          isActive
                            ? "text-on-surface bg-primary/10"
                            : "text-secondary hover:text-on-surface hover:bg-primary/5"
                        )}
                      >
                        {Icon && (
                          <Icon className="w-4 h-4 text-secondary opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />
                        )}
                        {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                      </Link>
                    );
                  })}

                  {!collapsed && section.id === "banking" && (
                    <div className="pl-8 space-y-1.5 py-1">
                      <Link
                        href="/expense?focus=credit-cards"
                        className={cn(
                          "block text-[10px] uppercase tracking-[1.7px] transition-colors",
                          "text-secondary hover:text-amber-300"
                        )}
                      >
                        Credit Cards
                      </Link>
                      <Link
                        href="/expense?focus=loans"
                        className={cn(
                          "block text-[10px] uppercase tracking-[1.7px] transition-colors",
                          "text-secondary hover:text-cyan-300"
                        )}
                      >
                        Loans
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Notification bell */}
      <div className={cn("mt-6 pt-6 border-t border-outline/50 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <span className="text-[9px] uppercase tracking-[2px] text-secondary/50 font-bold">Alerts</span>}
        <NotificationBell workspaceId={DEFAULT_WORKSPACE_ID} />
      </div>

      {/* Footer / Logout */}
      <div className="mt-6 pt-6 border-t border-outline/50 space-y-6">
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          title={collapsed ? "Logout" : undefined}
          className="flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-left text-secondary hover:text-danger w-full"
        >
          <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-colors text-red-500" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
        {!collapsed && <div className="text-[10px] text-secondary/60 leading-relaxed tracking-wider">
          © 2026 Arcana Sovereign<br />Intelligence Group
        </div>}
      </div>
    </aside>
  );
}
