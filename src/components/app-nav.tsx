"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Columns3,
  Plus,
  HardHat,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/board", label: "Board", icon: Columns3 },
  { href: "/projects/new", label: "New Project", icon: Plus },
  { href: "/subs", label: "Subcontractors", icon: HardHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/projects/new" && pathname.startsWith(`${href}/`)) ||
          (href === "/board" && pathname.startsWith("/projects/") && pathname !== "/projects/new");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
