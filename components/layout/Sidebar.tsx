"use client";
import { useI18n } from "@/components/providers/I18nProvider";
import { Home, User, Briefcase, Bot, ListTodo, Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: Home, label: "home" },
  { href: "/dashboard/profile", icon: User, label: "profile" },
  { href: "/dashboard/portfolio", icon: Briefcase, label: "portfolio" },
  { href: "/dashboard/jobs", icon: Briefcase, label: "jobs" },
  { href: "/dashboard/ai", icon: Bot, label: "aiCareerCoach" },
  { href: "/dashboard/tasks", icon: ListTodo, label: "tasks" },
  { href: "/dashboard/notifications", icon: Bell, label: "notifications" },
];

export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-background/80 backdrop-blur-md border-r border-border/50 h-full flex flex-col py-6 fixed left-0 top-0 bottom-0 z-40">
      {/* Logo Section */}
      <div className="px-6 pb-8 flex items-center gap-2 animate-fade-in">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("appName")}
          </h1>
          <p className="text-xs text-muted-foreground">Career Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }, idx) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg mx-1 transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              style={{
                animation: `slideInLeft 400ms cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 50}ms both`,
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-r" />
              )}
              <Icon size={18} className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
              <span className="font-medium text-sm">{t(label)}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/30 mt-auto">
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 text-center">
          <p className="text-xs font-medium text-foreground">Ready to</p>
          <p className="text-xs text-muted-foreground">Transform Your Career?</p>
        </div>
      </div>
    </aside>
  );
}
