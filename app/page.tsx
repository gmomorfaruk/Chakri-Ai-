"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Bot, Briefcase, Mic, Target, Sparkles, Eye, Rocket } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

function TypewriterText({
  text,
  className,
  delay = 0,
  speed = 35,
}: {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!isInView) return;

    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      let index = 0;
      interval = window.setInterval(() => {
        index += 1;
        setDisplayedText(text.slice(0, index));

        if (index >= text.length) {
          window.clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [delay, isInView, speed, text]);

  return (
    <div ref={ref} className={className}>
      {displayedText}
      {isInView && displayedText.length < text.length ? (
        <span className="ml-1 inline-block h-[0.9em] w-[2px] animate-pulse bg-current align-middle" />
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const tailSegments = [0, 1, 2, 3, 4, 5, 6];

  const features = [
    {
      title: "AI Coach",
      body: "Practice interview answers, refine strategy, and get guided role-specific preparation.",
      cta: "Try AI Coach",
      href: "/ai-coach",
      icon: Bot,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Job Matching",
      body: "See where your skills fit fastest with practical scoring and cleaner discovery.",
      cta: "Explore Job Matching",
      href: "/jobs/matching",
      icon: Target,
      color: "from-purple-500 to-indigo-400",
    },
    {
      title: "Voice Viva",
      body: "Move from silent preparation to live spoken practice with active simulation.",
      cta: "Start Voice Viva",
      href: "/ai-coach/viva",
      icon: Mic,
      color: "from-fuchsia-500 to-pink-400",
    },
    {
      title: "Job Tracker",
      body: "Keep applications, follow-up dates, and status changes visible and structured.",
      cta: "Open Job Tracker",
      href: "/jobs/tracker",
      icon: Briefcase,
      color: "from-emerald-500 to-teal-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <header className="mb-16 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-300">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{t("appName") || "Chakri AI"}</p>
              <p className="text-sm text-slate-400">Career Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-white/10 hover:text-white"
            >
              {t("signIn") || "Sign In"}
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] hover:from-blue-400 hover:to-purple-400 hover:shadow-blue-500/30"
            >
              {t("signUp") || "Sign Up"}
            </Link>
          </div>
        </header>

        {/* TOP SECTION: MISSION & VISION */}
        <section className="mb-24 space-y-16 py-4">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[48px] border border-white/10 bg-slate-900/20 p-1 transition-all hover:border-blue-500/30 md:p-1.5"
          >
            <div className="relative overflow-hidden rounded-[42px] bg-slate-950/80 px-8 py-12 md:px-16 md:py-20">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px] transition-all group-hover:bg-blue-600/20" />

              <div className="relative z-10 flex flex-col items-start gap-10 md:flex-row md:items-center">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-[32px] bg-blue-500 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/20 bg-gradient-to-br from-blue-500/20 to-blue-600/5 text-blue-400 shadow-2xl transition-transform group-hover:scale-110">
                    <Rocket size={48} strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  <span className="mb-4 inline-block text-xs font-black uppercase tracking-[0.4em] text-blue-500">
                    Our Purpose
                  </span>
                  <TypewriterText
                    text="Our Mission"
                    speed={75}
                    className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl"
                  />
                  <TypewriterText
                    text="To empower every job seeker in Bangladesh with AI-driven tools that bridge the gap between human potential and professional employment."
                    delay={400}
                    speed={22}
                    className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-slate-400 md:text-xl"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[48px] border border-white/10 bg-slate-900/20 p-1 transition-all hover:border-purple-500/30 md:p-1.5"
          >
            <div className="relative overflow-hidden rounded-[42px] bg-slate-950/80 px-8 py-12 md:px-16 md:py-20">
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px] transition-all group-hover:bg-purple-600/20" />

              <div className="relative z-10 flex flex-col items-start gap-10 text-left md:flex-row-reverse md:items-center md:text-right">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-[32px] bg-purple-500 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/20 bg-gradient-to-br from-purple-500/20 to-purple-600/5 text-purple-400 shadow-2xl transition-transform group-hover:scale-110">
                    <Eye size={48} strokeWidth={1.5} />
                  </div>
                </div>

                <div className="flex flex-col md:items-end">
                  <span className="mb-4 inline-block text-xs font-black uppercase tracking-[0.4em] text-purple-500">
                    The Future
                  </span>
                  <TypewriterText
                    text="Our Vision"
                    speed={75}
                    className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl"
                  />
                  <TypewriterText
                    text="Building a future where career growth is structured, transparent, and accessible to everyone in the nation through technology."
                    delay={400}
                    speed={22}
                    className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-slate-400 md:text-xl"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* MAIN SUBSECTION: FEATURES (ZIG-ZAG) */}
        <section className="relative">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Core Features</h2>
            <p className="mt-4 text-slate-400">The Dragon Path to your structured journey.</p>
          </div>

          {/* THE CONNECTING LINE */}
          <div className="absolute left-1/2 top-20 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent opacity-30 hidden md:block" />
          <div className="pointer-events-none absolute left-1/2 top-20 bottom-0 hidden w-32 -translate-x-1/2 md:block">
            {tailSegments.map((i) => (
              <motion.div
                key={i}
                animate={{
                  top: ["0%", "100%"],
                  x: [-40, 40, -40],
                }}
                transition={{
                  top: { duration: 14, repeat: Infinity, ease: "linear", delay: i * 0.18 },
                  x: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 },
                }}
                className="absolute left-1/2 z-50 -translate-x-1/2"
                style={{
                  opacity: 1 - i * 0.12,
                  scale: 1 - i * 0.07,
                }}
              >
                {i === 0 ? (
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-6 w-6 rounded-full bg-white shadow-[0_0_20px_#fff,0_0_40px_#3b82f6,0_0_80px_#3b82f6]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-1 w-1 rounded-full bg-cyan-200" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-full blur-[1px] shadow-[0_0_15px_rgba(59,130,246,0.5)] ${
                      i % 2 === 0 ? "h-4 w-4 bg-blue-400/60" : "h-3 w-3 bg-indigo-400/40"
                    }`}
                  />
                )}
              </motion.div>
            ))}
          </div>

          <div className="space-y-24 md:space-y-0">
            {features.map((feature, index) => {
              const isEven = index % 2 === 1;
              return (
                <div key={feature.title} className="relative md:h-[300px] flex items-center">
                  
                  {/* Connection Node Dot (On the line) */}
                  <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 hidden md:block" />
                  
                  {/* Horizontal Connection Line */}
                  <div className={`absolute top-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent hidden md:block
                    ${isEven ? 'left-1/2 w-1/4' : 'right-1/2 w-1/4'}`} 
                  />

                  <div className={`flex w-full ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
                    <motion.article
                      initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className={`relative w-full md:w-[45%] rounded-[32px] border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                          <feature.icon className="text-white" size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                      </div>
                      
                      <p className="mt-4 text-slate-400 leading-relaxed">
                        {feature.body}
                      </p>

                      <Link
                        href={feature.href}
                        className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-400 transition-colors hover:text-blue-300 group"
                      >
                        {feature.cta}
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.article>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
