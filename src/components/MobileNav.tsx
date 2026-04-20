"use client";

import { useState } from "react";
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
  Menu,
  X,
  Zap,
  BarChart2,
  Wallet,
  Target,
  Brain,
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
  BarChart2,
  Wallet,
  Target,
  Brain,
};

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-outline">
        <Link href="/" className="flex items-center gap-2 text-primary font-headline font-bold text-lg tracking-[4px] uppercase hover:opacity-80 transition-opacity">
          <Zap className="size-5" />
          <span>Arcana</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell workspaceId={DEFAULT_WORKSPACE_ID} />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-2 text-secondary hover:text-on-surface transition-colors"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav
            className="absolute left-0 top-0 h-full w-[280px] bg-background border-r border-outline py-10 px-8 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-10 flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)} className="text-primary font-headline font-bold text-lg tracking-[4px] uppercase flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Zap className="size-5" />
                Arcana
              </Link>
              <button
                type="button"
                title="Close menu"
                onClick={() => setOpen(false)}
                className="p-1 text-secondary hover:text-on-surface transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group",
                      isActive
                        ? "text-on-surface border-l-2 border-primary pl-4 -ml-4"
                        : "text-secondary hover:text-on-surface pl-0"
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 text-secondary opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors" />}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-outline/50 space-y-6">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="flex items-center gap-4 text-[11px] uppercase tracking-[2px] transition-all duration-300 group text-secondary hover:text-danger w-full"
              >
                <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100 text-red-500 transition-colors" />
                <span className="font-medium">Logout</span>
              </button>
              <div className="text-[10px] text-secondary/60 leading-relaxed tracking-wider">
                © 2026 Arcana Sovereign
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
