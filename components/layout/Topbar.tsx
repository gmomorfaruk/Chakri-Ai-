"use client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { LogOut, PanelLeft, Rows3 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function getActiveDashboardLabel(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/dashboard/profile")) return t("profile");
  if (pathname.startsWith("/dashboard/jobs")) return t("jobs");
  if (pathname.startsWith("/dashboard/ai")) return t("aiCareerCoach");
  if (pathname.startsWith("/dashboard/tasks")) return t("tasks");
  if (pathname.startsWith("/dashboard/notifications")) return t("notifications");
  return t("home");
}

type TopbarProps = {
  navMode?: "sidebar" | "navbar";
  onToggleNavMode?: () => void;
  showControls?: boolean;
};

export function Topbar({ navMode = "sidebar", onToggleNavMode, showControls = true }: TopbarProps) {
  const { t } = useI18n();
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const activeLabel = getActiveDashboardLabel(pathname, t);

  async function onSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b border-white/10 bg-[rgba(8,12,20,0.72)] px-3 sm:px-4 md:px-8 backdrop-blur-xl">
      {/* Left Section - Active Page Info */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
        <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
          <span className="hidden sm:inline">{t("dashboard")} / </span>
          {activeLabel}
        </span>
      </div>

      {/* Right Section - Controls */}
      {showControls ? (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          {/* Language Switcher */}
          <div className="transition-all duration-300 hover:scale-105">
            <LanguageSwitcher />
          </div>

          {/* Theme Switcher */}
          <div className="transition-all duration-300 hover:scale-105">
            <ThemeSwitcher />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border/50"></div>

          {onToggleNavMode ? (
            <button
              onClick={onToggleNavMode}
              className="btn-secondary inline-flex h-10 items-center gap-1.5 border border-white/20 bg-white/5 px-2.5 text-xs text-slate-200 hover:border-cyan-300/45 hover:bg-cyan-500/10 sm:gap-2 sm:px-3"
              title={navMode === "sidebar" ? t("switchToNavbar") : t("switchToSidebar")}
            >
              {navMode === "sidebar" ? <Rows3 size={15} /> : <PanelLeft size={15} />}
              <span className="hidden lg:inline">{navMode === "sidebar" ? t("navbarView") : t("sidebarView")}</span>
            </button>
          ) : null}

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="btn-secondary group inline-flex h-10 items-center gap-1.5 border border-destructive/30 bg-destructive/10 px-2.5 text-xs text-slate-200 hover:border-destructive/50 hover:bg-destructive/15 hover:text-destructive sm:gap-2 sm:px-3 md:text-sm"
          >
            <span className="hidden sm:inline">{t("signOut")}</span>
            <LogOut size={16} className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-destructive" />
          </button>
        </div>
      ) : null}
    </header>
  );
}
