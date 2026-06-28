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
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("arcana.sidebar.collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("arcana.sidebar.collapsed", collapsed ? "true" : "false");
  }, [collapsed]);

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
      <nav className="flex-1 space-y-4">
        {NAV_ITEMS.map((item) => {
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
                collapsed ? "gap-0 justify-center px-2 py-2 rounded-sm" : "gap-4",
                isActive
                  ? collapsed
                    ? "text-on-surface bg-primary/10"
                    : "text-on-surface border-l-2 border-primary pl-4 -ml-[34px]"
                  : "text-secondary hover:text-on-surface",
                collapsed && isActive && "border-l-0 -ml-0 bg-primary/10"
              )}
            >
              {Icon && <Icon className="w-4 h-4 text-secondary opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />}
              {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
            </Link>
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
