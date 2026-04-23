"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCoachRoute = pathname.startsWith("/dashboard/ai");

  const mainClass = isCoachRoute
    ? "relative flex-1 min-w-0 overflow-hidden bg-background/75"
    : "relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-background/75 px-3 py-2 sm:px-4 sm:py-3 md:px-8 md:py-4";

  const contentWrapperClass = isCoachRoute ? "min-w-0 h-full w-full max-w-none" : "mx-auto min-w-0 max-w-7xl";

  const rootStyle = {
    "--dashboard-top-offset-mobile": "7.25rem",
    "--dashboard-top-offset-desktop": "7rem",
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen h-[100dvh] w-full overflow-hidden bg-background text-foreground" style={rootStyle}>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavbar />
        <main className={mainClass}>
          <AuthGuard>
            <div className={contentWrapperClass}>{children}</div>
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}
