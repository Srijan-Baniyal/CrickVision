"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/deliveries", label: "Deliveries" },
  { href: "/wagon-wheel", label: "Wagon wheel" },
  { href: "/pitch-map", label: "Pitch map" },
  { href: "/stats", label: "Stats" },
] as const;

export function MatchTabs({ matchId }: { matchId: string }) {
  const pathname = usePathname();
  const base = `/matches/${matchId}`;
  return (
    <nav className="flex gap-1 border-border border-b">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive =
          tab.href === "" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            className={cn(
              "border-transparent border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            href={href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
