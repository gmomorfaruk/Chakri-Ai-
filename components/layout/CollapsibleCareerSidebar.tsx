"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  Bell,
  Bot,
  Briefcase,
  ChevronLeft,
  Home,
  ListChecks,
  Menu,
  UserRound,
} from "lucide-react";
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  active?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

interface CollapsibleCareerSidebarProps {
  sections?: NavSection[];
  className?: string;
  onWidthChange?: (width: number) => void;
}

const defaultSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Home", icon: Home, href: "/dashboard" },
      { label: "Profile", icon: UserRound, href: "/dashboard/profile", active: true },
    ],
  },
  {
    title: "Career",
    items: [
      { label: "Jobs", icon: Briefcase, href: "/dashboard/jobs", badge: 3 },
      { label: "AI Career Coach", icon: Bot, href: "/dashboard/ai" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Tasks", icon: ListChecks, href: "/dashboard/tasks", badge: 5 },
      { label: "Notifications", icon: Bell, href: "/dashboard/notifications", badge: 2 },
    ],
  },
];

export function CollapsibleCareerSidebar({ sections = defaultSections, className, onWidthChange }: CollapsibleCareerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sidebarWidth = collapsed ? 80 : 272;

  useEffect(() => {
    const width = isMobile ? 0 : sidebarWidth;
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
    onWidthChange?.(width);
  }, [sidebarWidth, isMobile, onWidthChange]);

  const sidebarNode = (
    <div
      className="flex h-full flex-col justify-between border-r border-[#1c2636] bg-[#0e1420]/98 text-[#e8eef8] shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-[width] duration-200"
      style={{ width: sidebarWidth }}
    >
      <div className="space-y-5 px-4 pt-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#243149] bg-gradient-to-br from-[#1a3a6a] to-[#0d1e3d]">
            <div className="h-4 w-4 rounded-md border border-[#4f8ef7] bg-[#1a3a6a] shadow-[0_0_0_3px_rgba(79,142,247,0.1)]" />
          </div>
          {!collapsed && (
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Chakri AI</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#4d6080]">career platform</div>
            </div>
          )}
          <button
            className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg border border-[#1c2636] bg-[#131926] text-[#8a9ab5] transition hover:border-[#263347] hover:text-[#e8eef8] md:flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Nav */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              {!collapsed && (
                <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4d6080]">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname?.startsWith(item.href) ?? false;
                  const base =
                    "group relative flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors";
                  const activeCls = active
                    ? "bg-[#0d1e3d] border border-[#1a3360] text-[#7aaeff]"
                    : "border border-transparent text-[#8a9ab5] hover:bg-[#131926] hover:text-[#e8eef8]";

                  const button = (
                    <button
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={cn(base, activeCls)}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-[#4f8ef7]" : "text-[#4d6080]")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {item.badge && (
                        <span className="ml-auto rounded-md border border-[#263347] bg-[#1a2133] px-2 py-0.5 text-[10px] text-[#8a9ab5]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );

                  return <div key={item.label}>{button}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User card */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#263347] bg-[#131926] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a3a6a] to-[#0d1e3d] text-[#7aaeff]">
            <span className="text-sm font-bold">FA</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[#e8eef8]">faarukh181</div>
              <div className="text-[11px] text-[#4d6080]">free plan</div>
            </div>
          )}
          <span className="ml-auto h-2 w-2 rounded-full bg-[#34d399]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Mobile trigger */}
      <div className="md:hidden">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1c2636] bg-[#0e1420] text-[#e8eef8]"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar only */}
      <div className="hidden md:block">{sidebarNode}</div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50">{sidebarNode}</div>
        </div>
      )}
    </div>
  );
}
