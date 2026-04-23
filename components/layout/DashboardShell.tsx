"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

function DashboardFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#040a14] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-bold">✦</span>
              <div>
                <div className="font-display text-lg font-bold text-white">Chakri <span className="text-blue-400">AI</span></div>
                <div className="text-[12px] text-slate-400">Career Platform</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Bangladesh's first AI-powered career platform. We help job seekers find their perfect match and prepare for success.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-[0.15em] mb-4">Quick Links</h3>
            <div className="space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "Jobs", href: "/jobs" },
                { label: "AI Coach", href: "/ai-coach" },
                { label: "Job Matching", href: "/jobs/matching" },
                { label: "Portfolio", href: "/profile/portfolio" },
                { label: "About Us", href: "#" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block text-sm text-slate-300 hover:text-white transition"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-[0.15em] mb-4">Company</h3>
            <div className="space-y-2">
              {[
                { label: "About Us", href: "#" },
                { label: "Our Team", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Contact Us", href: "#" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block text-sm text-slate-300 hover:text-white transition"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact & Social */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-[0.15em] mb-4">Connect With Us</h3>
            <div className="space-y-4">
              <div className="text-sm text-slate-300">
                <div className="font-medium text-white mb-2">Location</div>
                <div>Dhaka, Bangladesh</div>
              </div>
              
              <div className="flex gap-3">
                {[
                  { name: "Facebook", icon: "📘", href: "#" },
                  { name: "WhatsApp", icon: "💬", href: "#" },
                  { name: "LinkedIn", icon: "💼", href: "#" },
                  { name: "Twitter", icon: "🐦", href: "#" },
                  { name: "Instagram", icon: "📸", href: "#" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300"
                    title={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Chakri AI. All Rights Reserved.
            </div>
            <div className="text-sm text-slate-400">
              Website developed by <a href="https://github.com/gmomorfaruk" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-blue-300 transition">Md. Omor Faruk</a>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Made with ❤️ in Bangladesh</span>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>Bengali & English Supported</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

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
        {/* Footer only on non-AI pages */}
        {!isCoachRoute && <DashboardFooter />}
      </div>
    </div>
  );
}
