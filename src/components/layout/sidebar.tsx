"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  AppWindow,
  Building2,
  ShieldCheck,
  Download,
  FileBarChart,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: AppWindow },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/review", label: "Review", icon: ShieldCheck },
  { href: "/ingestion", label: "Ingestion", icon: Download },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">AppTrace</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
