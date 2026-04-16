"use client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function getActiveDashboardLabel(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/dashboard/profile")) return t("profile");
  if (pathname.startsWith("/dashboard/jobs")) return t("jobs");
  if (pathname.startsWith("/dashboard/ai")) return t("aiCareerCoach");
  if (pathname.startsWith("/dashboard/tasks")) return t("tasks");
  if (pathname.startsWith("/dashboard/notifications")) return t("notifications");
  return t("home");
}

export function Topbar() {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/30 bg-background/80 px-4 md:px-8 shadow-sm backdrop-blur-xl">
      {/* Left Section - Active Page Info */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse"></div>
        <span className="text-sm font-medium text-muted-foreground">Dashboard / {activeLabel}</span>
      </div>

      {/* Right Section - Controls */}
      <div className="flex items-center gap-4">
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

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="group relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm overflow-hidden transition-all duration-300"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/10 to-destructive/0 group-hover:from-destructive/10 group-hover:via-destructive/20 group-hover:to-destructive/10 transition-all duration-300" />
          
          {/* Border */}
          <div className="absolute inset-0 border border-destructive/20 group-hover:border-destructive/50 rounded-lg transition-all duration-300" />
          
          {/* Content */}
          <span className="relative text-foreground group-hover:text-destructive transition-colors duration-300">
            {t("signOut")}
          </span>
          <LogOut
            size={16}
            className="relative text-muted-foreground group-hover:text-destructive transition-all duration-300 group-hover:translate-x-1"
          />
        </button>
      </div>
    </header>
  );
}
