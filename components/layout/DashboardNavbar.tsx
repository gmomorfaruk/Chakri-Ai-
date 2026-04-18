"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bot, Briefcase, Home, ListTodo, LogOut, PanelLeft, User } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems = [
  { href: "/dashboard", icon: Home, label: "home" },
  { href: "/dashboard/profile", icon: User, label: "profile" },
  { href: "/dashboard/jobs", icon: Briefcase, label: "jobs" },
  { href: "/dashboard/ai", icon: Bot, label: "aiCareerCoach" },
  { href: "/dashboard/tasks", icon: ListTodo, label: "tasks" },
  { href: "/dashboard/notifications", icon: Bell, label: "notifications" },
];

type DashboardNavbarProps = {
  navMode?: "sidebar" | "navbar";
  onToggleNavMode?: () => void;
};

export function DashboardNavbar({ navMode = "navbar", onToggleNavMode }: DashboardNavbarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const supabase = useSupabase();
  const router = useRouter();

  async function onSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,12,20,0.92),rgba(8,12,20,0.84))] shadow-[0_10px_30px_rgba(2,8,23,0.2)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl min-w-0 px-3 py-2.5 sm:px-4 md:px-8">
        <div className="flex min-w-0 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all sm:text-sm ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/30 via-blue-500/24 to-violet-500/24 text-white shadow-[0_8px_22px_rgba(34,211,238,0.22)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-cyan-100" : "text-slate-500"} />
                  <span>{t(label)}</span>
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher className="h-9 rounded-lg border-white/15 bg-white/[0.03] text-xs sm:text-sm" />
            <ThemeSwitcher className="h-9 w-9 rounded-lg border-white/15 bg-white/[0.03]" />
            <button
              type="button"
              onClick={onToggleNavMode}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 text-xs font-semibold text-slate-300 transition-all hover:border-cyan-300/35 hover:bg-cyan-500/10 hover:text-cyan-100"
              title={navMode === "navbar" ? t("switchToSidebar") : t("switchToNavbar")}
            >
              <PanelLeft size={14} />
              <span className="hidden lg:inline">{t("sidebar")}</span>
            </button>
            <div className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />
            <button
              type="button"
              onClick={onSignOut}
              className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/8 px-2.5 text-xs font-semibold text-rose-200 transition-all hover:border-rose-300/45 hover:bg-rose-500/14"
            >
              <span className="hidden sm:inline">{t("signOut")}</span>
              <LogOut size={14} className="transition-all group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
