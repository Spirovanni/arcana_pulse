"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
  Zap,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

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
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[260px] flex-col bg-background border-r border-outline py-12 px-8 z-40 h-screen sticky top-0">
      {/* Brand */}
      <Link href="/" className="mb-12 block group">
        <h2 className="text-primary font-headline font-bold text-lg tracking-[4px] uppercase flex items-center gap-2 group-hover:opacity-80 transition-opacity">
          <Zap className="size-5" />
          Arcana
        </h2>
        <p className="text-[9px] uppercase tracking-widest text-secondary mt-1 ml-7">
          Pulse Environment
        </p>
      </Link>

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
              className={cn(
                "w-full flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-left",
                isActive
                  ? "text-on-surface border-l-2 border-primary pl-4 -ml-[34px]"
                  : "text-secondary hover:text-on-surface pl-0"
              )}
            >
              {Icon && <Icon className="w-4 h-4 text-secondary opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />}
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Notification bell */}
      <div className="mt-6 pt-6 border-t border-outline/50 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[2px] text-secondary/50 font-bold">Alerts</span>
        <NotificationBell workspaceId={DEFAULT_WORKSPACE_ID} />
      </div>

      {/* Footer / Logout */}
      <div className="mt-6 pt-6 border-t border-outline/50 space-y-6">
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-left text-secondary hover:text-danger w-full"
        >
          <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-colors text-red-500" />
          <span className="font-medium">Logout</span>
        </button>
        <div className="text-[10px] text-secondary/60 leading-relaxed tracking-wider">
          © 2026 Arcana Sovereign<br />Intelligence Group
        </div>
      </div>
    </aside>
  );
}
