"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  SendHorizontal,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  SendHorizontal,
  Settings,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-arcana-surface border-r border-arcana-border h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-arcana-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-arcana-blue">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide">
            Arcana Pulse
          </p>
          <p className="text-xs text-slate-400">Arcana Credit Union</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-arcana-blue text-white"
                  : "text-slate-300 hover:bg-arcana-navy hover:text-white"
              }`}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="px-3 py-4 border-t border-arcana-border">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-arcana-navy hover:text-white transition-colors w-full">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
