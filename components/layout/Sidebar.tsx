"use client";
import { useI18n } from "@/components/providers/I18nProvider";
import { Home, User, Briefcase, Bot, ListTodo, Bell, Sparkles, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "home" },
  { href: "/dashboard/profile", icon: User, label: "profile" },
  { href: "/dashboard/jobs", icon: Briefcase, label: "jobs" },
  { href: "/dashboard/ai", icon: Bot, label: "aiCareerCoach" },
  { href: "/dashboard/tasks", icon: ListTodo, label: "tasks" },
  { href: "/dashboard/notifications", icon: Bell, label: "notifications" },
];

export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const applyResponsiveCollapse = () => {
      setCollapsed(!mediaQuery.matches);
    };

    applyResponsiveCollapse();
    mediaQuery.addEventListener("change", applyResponsiveCollapse);
    return () => mediaQuery.removeEventListener("change", applyResponsiveCollapse);
  }, []);

  return (
    <aside
      className={`${collapsed ? "w-[78px] sm:w-[88px]" : "w-[252px] xl:w-[292px]"} sticky top-0 z-40 flex h-[100dvh] shrink-0 flex-col border-r border-white/10 bg-[rgba(8,12,20,0.78)] p-2.5 text-slate-100 shadow-[10px_0_36px_rgba(2,8,23,0.35)] backdrop-blur-xl transition-all duration-300 sm:p-3 md:p-4`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-14 left-8 h-40 w-40 rounded-full bg-blue-500/14 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-48 w-48 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.07]" />
      </div>

      {/* Logo Section with toggle */}
      <div className={`relative z-10 mb-5 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500 to-cyan-400 text-[#041123] shadow-[0_10px_30px_rgba(56,189,248,0.35)]">
              <Sparkles size={18} className="text-[#041123]" />
              <span className="absolute inset-0 rounded-2xl border border-cyan-200/40" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                {t("appName")}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{t("sidebarCareerCommand")}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="btn-secondary flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/5 p-0 text-slate-300 hover:border-cyan-300/40 hover:text-white"
          aria-label={t("sidebarToggle")}
          title={collapsed ? t("sidebarExpand") : t("sidebarCollapse")}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="relative z-10 mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90">{t("sidebarTodayFocus")}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{t("sidebarStayInterviewReady")}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-2 overflow-y-auto px-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t("sidebarNavigation")}</p>
        )}
        {navItems.map(({ href, icon: Icon, label }, idx) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? t(label) : undefined}
              className={`group relative flex items-center ${collapsed ? "justify-center" : "justify-start"} gap-3 rounded-xl px-3 py-3 transition-all duration-300 ${
                isActive
                  ? "border border-cyan-300/35 bg-gradient-to-r from-blue-500/20 via-cyan-400/12 to-transparent text-cyan-100 shadow-[0_8px_22px_rgba(56,189,248,0.16)]"
                  : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
              }`}
              style={{
                animation: `slideInLeft 400ms cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 50}ms both`,
              }}
            >
              {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-blue-300 to-cyan-300" />}
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isActive ? "bg-cyan-300/20" : "bg-transparent group-hover:bg-white/10"}`}>
                <Icon size={18} className={`transition-transform duration-300 ${isActive ? "scale-110 text-cyan-200" : "group-hover:scale-105"}`} />
              </div>
              {!collapsed && <span className="font-medium text-sm tracking-tight">{t(label)}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)] animate-pulse-subtle" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="relative z-10 mt-4 border-t border-white/10 pt-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">{t("sidebarMomentum")}</p>
            <p className="mt-1 text-xs text-slate-300">{t("sidebarTransformCareerWeek")}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
