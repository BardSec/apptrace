"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Building2,
  ShieldCheck,
  Database,
  BarChart3,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apps", label: "Discovered Apps", icon: Globe },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/review", label: "Privacy Review", icon: ShieldCheck },
  { href: "/ingestion", label: "Ingestion", icon: Database },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
        <Shield className="h-6 w-6 text-indigo-600" />
        <span className="text-lg font-bold text-slate-900">AppTrace</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
                size={18}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-400">v0.1.0 MVP</p>
      </div>
    </aside>
  );
}
