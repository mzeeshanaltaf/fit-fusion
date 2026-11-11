import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-context";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardDataProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Desktop side nav; below lg it lives in a sheet inside TopNav. */}
        <aside className="sticky top-0 hidden h-screen border-r border-border lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-col">
          <TopNav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </DashboardDataProvider>
  );
}
