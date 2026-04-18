"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

type NavMode = "sidebar" | "navbar";

const NAV_MODE_STORAGE_KEY = "chakri.dashboard.nav-mode.v2";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [navMode, setNavMode] = useState<NavMode>("navbar");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(NAV_MODE_STORAGE_KEY);
    if (saved === "navbar" || saved === "sidebar") {
      setNavMode(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NAV_MODE_STORAGE_KEY, navMode);
  }, [navMode]);

  const rootStyle = useMemo(
    () =>
      ({
        "--dashboard-top-offset-mobile": navMode === "navbar" ? "7.25rem" : "6.25rem",
        "--dashboard-top-offset-desktop": navMode === "navbar" ? "7rem" : "7rem",
      }) as React.CSSProperties,
    [navMode]
  );

  const toggleNavMode = () => {
    setNavMode((prev) => (prev === "sidebar" ? "navbar" : "sidebar"));
  };

  if (navMode === "navbar") {
    return (
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground" style={rootStyle}>
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardNavbar navMode={navMode} onToggleNavMode={toggleNavMode} />
          <main className="relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-background/75 px-3 py-3 sm:px-4 sm:py-4 md:px-8 md:py-5">
            <AuthGuard>
              <div className="mx-auto min-w-0 max-w-7xl">{children}</div>
            </AuthGuard>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground" style={rootStyle}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar navMode={navMode} onToggleNavMode={toggleNavMode} />
        <main className="relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-background/75 px-3 py-4 pt-3 sm:px-4 sm:py-5 sm:pt-4 md:px-8 md:py-6 md:pt-8">
          <AuthGuard>
            <div className="mx-auto min-w-0 max-w-7xl">{children}</div>
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}
