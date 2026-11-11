"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardPlus,
  CreditCard,
  History,
  LayoutDashboard,
  LifeBuoy,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/marketing/wordmark";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/generate", label: "Generate plan", icon: ClipboardPlus },
  { href: "/dashboard/plans", label: "My plans", icon: History },
  { href: "/dashboard/credits", label: "Credits", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const itemClass =
  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-(--dur-fast) ease-out-quart";

/** `onNavigate` lets the mobile sheet close itself when a link is followed. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
        <Wordmark href="/dashboard" />
      </div>

      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {navItems.map((item) => {
            const { href, label, icon: Icon } = item;
            const exact = "exact" in item && item.exact;
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    itemClass,
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-4">
        <Link
          href="/contact"
          onClick={onNavigate}
          className={cn(itemClass, "text-muted-foreground hover:bg-accent hover:text-foreground")}
        >
          <LifeBuoy aria-hidden className="size-4" />
          Help and contact
        </Link>
      </div>
    </div>
  );
}
