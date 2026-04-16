"use client";
import { useI18n } from "@/components/providers/I18nProvider";
import { Home, User, Briefcase, Bot, ListTodo, Bell, Sparkles, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? "w-[92px]" : "w-[292px]"} relative shrink-0 h-screen sticky top-0 border-r border-white/10 bg-[#070d18] text-slate-100 flex flex-col p-4 transition-all duration-300 z-40 shadow-[12px_0_50px_rgba(0,0,0,0.35)]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-14 left-8 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]" />
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
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Career Command</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-cyan-300/40"
          aria-label="Toggle sidebar"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="relative z-10 mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90">Today Focus</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">Stay interview-ready</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-10 flex-1 space-y-2 overflow-y-auto px-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Navigation</p>
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
                  ? "border border-cyan-300/40 bg-gradient-to-r from-blue-500/25 via-cyan-400/15 to-transparent text-cyan-100 shadow-[0_10px_30px_rgba(56,189,248,0.2)]"
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">Momentum</p>
            <p className="mt-1 text-xs text-slate-300">Transform your career this week</p>
          </div>
        </div>
      )}
    </aside>
  );
}
