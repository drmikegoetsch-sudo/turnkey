"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, LogOut, Menu } from "lucide-react";

const NAV_ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/board", label: "Board" },
  { href: "/subs", label: "Subcontractors" },
  { href: "/settings", label: "Settings" },
];

export function TopBar({
  email,
  initials,
  onSignOut,
}: {
  email: string;
  initials: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/board?q=${encodeURIComponent(query)}` : "/board");
  }

  return (
    <header className="glass-bar sticky top-0 z-40">
      <div className="flex items-center gap-4 px-4 py-2.5 md:px-6">
        <Link href="/today" className="flex shrink-0 items-center gap-2">
          <Image
            src="/icon.png"
            alt=""
            width={30}
            height={30}
            priority
            className="size-[30px]"
          />
          <span className="hidden font-heading text-base font-semibold tracking-tight lg:block">
            Turn Key
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              solutions network
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-9 w-56 rounded-full border bg-background pl-9 pr-3 text-sm outline-none transition-[width] placeholder:text-muted-foreground focus:w-72 focus:ring-2 focus:ring-ring/40 lg:w-64"
            />
          </div>
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background sm:ml-0"
              aria-label="Account menu"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSignOut()}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {menuOpen ? (
        <nav className="flex flex-col gap-1 border-t border-white/40 px-4 py-3 md:hidden">
          <form
            onSubmit={(e) => {
              submitSearch(e);
              setMenuOpen(false);
            }}
            className="mb-1"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="h-10 w-full rounded-full border bg-background/80 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </form>
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
