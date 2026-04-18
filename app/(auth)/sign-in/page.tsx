"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

declare global {
  interface Window {
    THREE?: typeof THREE;
    Cypress?: unknown;
  }
}

export default function SignInPage() {
  const supabase = useSupabase();
  const { t } = useI18n();
  const router = useRouter();
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const haloEffectRef = useRef<{ destroy?: () => void } | null>(null);
  const flyingLabels = [
    { position: "left-[3%] top-[8%]", motion: "flying-brand-text", duration: "5.4s" },
    { position: "left-[6%] top-[28%]", motion: "flying-brand-text-left", duration: "6.2s" },
    { position: "left-[4%] top-[72%]", motion: "flying-brand-text-rise", duration: "5.8s" },
    { position: "left-[10%] top-[88%]", motion: "flying-brand-text-swoop", duration: "6.8s" },
    { position: "right-[3%] top-[10%]", motion: "flying-brand-text-left", duration: "5.6s" },
    { position: "right-[7%] top-[42%]", motion: "flying-brand-text-swoop", duration: "6.4s" },
    { position: "right-[4%] top-[78%]", motion: "flying-brand-text-rise", duration: "5.9s" },
  ];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (window.Cypress) {
      return () => {
        mounted = false;
      };
    }

    async function initVanta() {
      if (!vantaRef.current || haloEffectRef.current) {
        return;
      }

      try {
        window.THREE = THREE;
        const { default: BIRDS } = await import("vanta/dist/vanta.birds.min");

        if (!mounted || !vantaRef.current || haloEffectRef.current) {
          return;
        }

        haloEffectRef.current = BIRDS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          backgroundColor: 0x020617,
          color1: 0x60a5fa,
          color2: 0xa855f7,
          birdSize: 1.1,
          wingSpan: 18,
          speedLimit: 3,
          separation: 32,
          alignment: 28,
          cohesion: 30,
          quantity: 6,
          scale: 1,
          scaleMobile: 1,
        });
      } catch {
        // Keep sign-in usable when WebGL effects fail to initialize.
      }
    }

    initVanta();

    return () => {
      mounted = false;
      haloEffectRef.current?.destroy?.();
      haloEffectRef.current = null;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div ref={vantaRef} className="absolute inset-0" />
        <div className="absolute inset-0 bg-slate-950/35" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
        {flyingLabels.map((label, index) => (
          <div
            key={`${label.position}-${label.motion}`}
            className={`absolute ${label.position}`}
            style={{
              animationDelay: `${index * 0.7}s`,
            }}
          >
            <div
              className={`${label.motion} rounded-full border border-cyan-300/25 bg-slate-950/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-200/80 shadow-[0_0_25px_rgba(34,211,238,0.15)] backdrop-blur-md`}
              style={{
                animationDelay: `${index * 0.7}s`,
                animationDuration: label.duration,
              }}
            >
              Chakri AI
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-20 w-full max-w-md p-1">
        <div className="animated-rgb-border rounded-[32px] p-px shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
          <div className="relative z-10 overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-10 top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-sm" />

            <div className="relative z-10 mb-8 text-center">
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">{t("signIn")}</h1>
              <p className="mt-2 text-sm font-light text-slate-400">
                {t("signInContinueJourney")}
                <span className="font-medium text-blue-400"> {t("appName")}</span>
              </p>
            </div>

            <form onSubmit={onSubmit} className="relative z-10 space-y-6">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t("emailAddress")}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t("authEmailPlaceholder")}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-white placeholder:text-slate-600 transition-all focus:border-blue-500/50 focus:bg-white/10 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="ml-1 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {t("password")}
                  </label>
                  <a href="#" className="text-[10px] uppercase tracking-tighter text-blue-500 hover:underline">
                    {t("forgotPasswordShort")}
                  </a>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-white placeholder:text-slate-600 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 transition-opacity group-hover:opacity-10" />
                <span className="relative">{loading ? t("loading") : t("signIn")}</span>
              </button>
            </form>

            <div className="relative z-10 mt-8 text-center">
              <p className="text-sm text-slate-500">
                {t("newToPlatform")}
                <a href="/sign-up" className="ml-2 font-bold text-white transition-colors hover:text-blue-400">
                  {t("createAccount")}
                </a>
              </p>
            </div>

            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 bg-purple-500/10 blur-3xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
