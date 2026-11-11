"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { Wordmark } from "@/components/marketing/wordmark";
import { useSession } from "@/lib/auth-client";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { Sidebar } from "./sidebar";

export function TopNav() {
  const { creditBalance, loading } = useDashboardData();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon-sm">
              <MenuIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 gap-0 p-0">
            <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
            <SheetDescription className="sr-only">
              Move between dashboard pages
            </SheetDescription>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <Wordmark href="/dashboard" className="text-xl" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {loading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <Link
            href="/dashboard/credits"
            className="t-small flex h-10 items-center gap-1.5 rounded-md px-2 font-semibold hover:bg-accent"
            aria-label={`${creditBalance} credits left`}
          >
            <span className="t-num text-base">{creditBalance}</span>
            <span className="text-muted-foreground">
              credit{creditBalance === 1 ? "" : "s"}
            </span>
          </Link>
        )}
        <ThemeToggle />
        {session?.user && <UserMenu user={session.user} />}
      </div>
    </header>
  );
}
