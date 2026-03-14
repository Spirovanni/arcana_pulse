"use client";

import { useState } from "react";
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
  Menu,
  X,
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

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-arcana-surface border-b border-arcana-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-arcana-blue">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Arcana Pulse</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)}>
          <nav
            className="absolute left-0 top-0 h-full w-72 bg-arcana-surface border-r border-arcana-border p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-4 mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-arcana-blue">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Arcana Pulse</p>
                <p className="text-xs text-slate-400">Arcana Credit Union</p>
              </div>
            </div>

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

            <div className="pt-4 mt-4 border-t border-arcana-border">
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-arcana-navy hover:text-white transition-colors w-full">
                <LogOut className="w-5 h-5 flex-shrink-0" />
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
