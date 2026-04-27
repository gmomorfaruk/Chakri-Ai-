"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Sparkles, User, X } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const primaryLinks = [
  { href: "/dashboard", label: "home" },
  { href: "/dashboard/jobs", label: "jobs" },
  { href: "/dashboard/tasks", label: "tasks" },
];

const coachLinks = [
  { href: "/dashboard/ai?view=learning", label: "Career Coach AI", view: "learning" as const },
  { href: "/dashboard/ai?view=chat", label: "Interview AI", view: "chat" as const },
  { href: "/dashboard/ai?view=quiz", label: "quizPractice", view: "quiz" as const, isTranslationKey: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFromIdentity(fullName: string, email: string) {
  const source = fullName.trim() || email.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function NavItem({ href, label, pathname, t }: { href: string; label: string; pathname: string; t: (key: string) => string }) {
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center px-2 py-2 text-sm font-medium transition-colors duration-200 ${
        isActive ? "text-slate-100" : "text-slate-300 hover:text-slate-100"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{t(label)}</span>
      <span
        className={`absolute bottom-1 left-2 right-2 h-0.5 rounded-full transition-opacity duration-200 ${
          isActive ? "bg-cyan-300/80 opacity-100" : "bg-slate-300/60 opacity-0 group-hover:opacity-60"
        }`}
      />
    </Link>
  );
}

export function DashboardNavbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const supabase = useSupabase();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCoachOpen, setMobileCoachOpen] = useState(false);
  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const [avatarText, setAvatarText] = useState("U");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [activeCoachView, setActiveCoachView] = useState<"chat" | "quiz" | "learning">("learning");
  const coachMenuRef = useRef<HTMLDivElement | null>(null);
  const isCoachActive = pathname.startsWith("/dashboard/ai");

  useEffect(() => {
    const routesToPrefetch = [
      "/dashboard",
      "/dashboard/jobs",
      "/dashboard/tasks",
      "/dashboard/profile",
      "/dashboard/notifications",
      "/dashboard/ai",
    ];

    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileCoachOpen(false);
    setCoachMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isCoachActive || typeof window === "undefined") {
      setActiveCoachView("learning");
      return;
    }

    const viewParam = new URLSearchParams(window.location.search).get("view");
    const nextView = viewParam === "chat" || viewParam === "quiz" || viewParam === "learning" ? viewParam : "learning";
    setActiveCoachView(nextView);
  }, [isCoachActive, pathname]);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!coachMenuRef.current) return;
      if (!coachMenuRef.current.contains(event.target as Node)) {
        setCoachMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    async function loadIdentity() {
      if (!supabase) return;

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
      const email = user.email ?? "";
      setAvatarText(initialsFromIdentity(fullName, email));

      const metadataAvatar =
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : typeof user.user_metadata?.picture === "string"
            ? user.user_metadata.picture
            : null;

      if (metadataAvatar) {
        setAvatarUrl(metadataAvatar);
        setAvatarImageFailed(false);
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      const profileAvatar = typeof profileData?.avatar_url === "string" ? profileData.avatar_url : null;
      setAvatarUrl(profileAvatar);
      setAvatarImageFailed(false);
    }

    void loadIdentity();
  }, [supabase]);

  async function onSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/sign-in");
  }

  const mobileMenuLayer =
    mobileMenuOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[80] bg-slate-950/70 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            <section
              id="dashboard-mobile-nav"
              className="fixed right-0 top-0 z-[90] h-[100dvh] w-full overflow-y-auto border-l border-white/10 bg-[linear-gradient(180deg,rgba(12,16,28,0.98),rgba(12,16,28,0.95))] p-5 md:hidden sm:w-[min(92vw,24rem)]"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
            >
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">Menu</p>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1" aria-label="Mobile primary navigation">
                <Link
                  href={primaryLinks[0].href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActivePath(pathname, primaryLinks[0].href) ? "bg-white/8 text-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  {t(primaryLinks[0].label)}
                </Link>
                <Link
                  href={primaryLinks[1].href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActivePath(pathname, primaryLinks[1].href) ? "bg-white/8 text-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  {t(primaryLinks[1].label)}
                </Link>

                <div className="rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMobileCoachOpen((prev) => !prev)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isCoachActive ? "bg-white/8 text-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                    }`}
                    aria-expanded={mobileCoachOpen}
                    aria-label="Toggle Career Coach menu"
                  >
                    <span>Career Coach</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform duration-200 ${mobileCoachOpen ? "rotate-180" : ""}`} />
                  </button>

                  {mobileCoachOpen ? (
                    <div className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-3">
                      {coachLinks.map((item) => {
                        const isItemActive = isCoachActive && activeCoachView === item.view;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setMobileCoachOpen(false);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex items-center rounded-lg px-2.5 py-2 text-sm transition-colors duration-200 ${
                              isItemActive ? "bg-white/8 text-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                            }`}
                          >
                            {item.isTranslationKey ? t(item.label) : item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <Link
                  href={primaryLinks[2].href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActivePath(pathname, primaryLinks[2].href) ? "bg-white/8 text-slate-100" : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  {t(primaryLinks[2].label)}
                </Link>
              </nav>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100"
                >
                  <Bell size={16} />
                  <span>{t("notifications")}</span>
                  <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
                </Link>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100"
                >
                  <User size={16} />
                  <span>{t("profile")}</span>
                </Link>
                <div className="pt-1">
                  <ThemeSwitcher className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border-0 bg-white/[0.04] text-sm text-slate-200 transition-colors duration-200 hover:bg-white/8" />
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-200 transition-colors duration-200 hover:bg-rose-500/10"
                >
                  <LogOut size={16} />
                  <span>{t("signOut")}</span>
                </button>
              </div>
            </section>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.94),rgba(10,14,24,0.82))] backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6">
          <div className="flex h-16 items-center justify-between gap-3 md:h-[68px]">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="inline-flex min-w-0 items-center gap-2" aria-label="Chakri AI">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 text-slate-950">
                  <Sparkles size={15} />
                </span>
                <span className="truncate text-sm font-medium tracking-tight text-slate-100 sm:text-base">Chakri AI</span>
              </Link>

              <nav className="hidden items-center gap-5 md:flex" aria-label="Primary">
                <NavItem href={primaryLinks[0].href} label={primaryLinks[0].label} pathname={pathname} t={t} />
                <NavItem href={primaryLinks[1].href} label={primaryLinks[1].label} pathname={pathname} t={t} />

                <div
                  className="relative"
                  ref={coachMenuRef}
                >
                  <button
                    type="button"
                    className={`group relative inline-flex items-center gap-1 px-2 py-2 text-sm font-medium transition-colors duration-200 ${
                      isCoachActive ? "text-slate-100" : "text-slate-300 hover:text-slate-100"
                    }`}
                    aria-label="Open Career Coach menu"
                    aria-expanded={coachMenuOpen}
                    onClick={() => setCoachMenuOpen((prev) => !prev)}
                  >
                    <span>Career Coach</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${coachMenuOpen ? "rotate-180" : ""}`} />
                    <span
                      className={`absolute bottom-1 left-2 right-2 h-0.5 rounded-full transition-opacity duration-200 ${
                        isCoachActive ? "bg-cyan-300/80 opacity-100" : "bg-slate-300/60 opacity-0 group-hover:opacity-60"
                      }`}
                    />
                  </button>

                  {coachMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-slate-900/98 p-1 text-sm shadow-xl"
                    >
                      {coachLinks.map((item) => {
                        const isItemActive = isCoachActive && activeCoachView === item.view;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setCoachMenuOpen(false)}
                            className={`flex items-center rounded-lg px-3 py-2 transition-colors duration-200 ${
                              isItemActive ? "bg-white/10 text-slate-100" : "text-slate-200 hover:bg-white/5"
                            }`}
                          >
                            <span>{item.isTranslationKey ? t(item.label) : item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <NavItem href={primaryLinks[2].href} label={primaryLinks[2].label} pathname={pathname} t={t} />
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/dashboard/profile"
                className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/8 text-xs font-medium text-slate-100 transition-colors duration-200 hover:bg-white/12"
                aria-label={t("profile")}
              >
                {avatarUrl && !avatarImageFailed ? (
                  <img
                    src={avatarUrl}
                    alt={t("profile")}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarImageFailed(true)}
                  />
                ) : (
                  avatarText
                )}
              </Link>

              <Link
                href="/dashboard/notifications"
                className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100 md:inline-flex"
                aria-label={t("notifications")}
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
              </Link>

              <ThemeSwitcher className="hidden h-9 w-9 rounded-lg border-0 bg-transparent p-0 text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100 md:inline-flex" />

              <button
                type="button"
                onClick={onSignOut}
                className="hidden h-9 items-center gap-1.5 rounded-lg border border-rose-300/25 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-100 transition-all hover:border-rose-300/40 hover:bg-rose-500/20 md:inline-flex"
                aria-label={t("signOut")}
              >
                <LogOut size={14} />
                <span className="hidden lg:inline">{t("signOut")}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100 md:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls="dashboard-mobile-nav"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuLayer}
    </>
  );
}
