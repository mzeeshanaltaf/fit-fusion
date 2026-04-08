"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "./sidebar";
import { useDashboardData } from "@/components/dashboard/dashboard-context";

interface TopNavProps {
  breadcrumb?: string;
}

export function TopNav({ breadcrumb = "Dashboard" }: TopNavProps) {
  const { creditBalance, loading } = useDashboardData();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4">
      {/* Mobile sidebar trigger */}
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb */}
        <span className="text-sm font-medium text-muted-foreground">
          {breadcrumb}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {!loading && (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>{creditBalance}</span>
            <span className="hidden sm:inline">credit{creditBalance !== 1 ? "s" : ""}</span>
          </div>
        )}
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
