"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Briefcase, Eye, ListTodo, Rocket, Sparkles, User } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { loadSavedJobs } from "@/lib/savedJobsStore";

const journeySteps = [
  {
    title: "Build Your Profile",
    body: "Complete your professional profile so matching and coaching can personalize guidance for you.",
    cta: "Complete Profile",
    href: "/dashboard/profile",
    icon: User,
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Practice Interviews",
    body: "Train with AI coaching to sharpen answers, build confidence, and improve interview readiness.",
    cta: "Practice Now",
    href: "/dashboard/ai",
    icon: Bot,
    color: "from-purple-500 to-fuchsia-400",
  },
  {
    title: "Explore Jobs",
    body: "Discover relevant opportunities from your hub and smart matching stream.",
    cta: "Explore Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase,
    color: "from-blue-500 to-indigo-400",
  },
  {
    title: "Track Applications",
    body: "Monitor each application stage and keep your pipeline clear and organized.",
    cta: "Open Tracker",
    href: "/dashboard/jobs/tracker",
    icon: ListTodo,
    color: "from-emerald-500 to-teal-400",
  },
  {
    title: "Grow Your Skills",
    body: "Use AI learning mode and targeted tasks to strengthen skills for your next role.",
    cta: "Grow Skills",
    href: "/dashboard/ai?view=learning",
    icon: Rocket,
    color: "from-amber-500 to-orange-400",
  },
];

const tailSegments = [0, 1, 2, 3, 4, 5, 6];

export default function DashboardHome() {
  const supabase = useSupabase();
  const [userName, setUserName] = useState("there");
  const [profileCompletion, setProfileCompletion] = useState(40);
  const [interviewAttempts, setInterviewAttempts] = useState(0);
  const [savedJobs, setSavedJobs] = useState(0);

  useEffect(() => {
    async function loadDashboardSignals() {
      if (!supabase) return;

      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) return;

        const emailPrefix = user.email?.split("@")[0] ?? "there";
        const metaName = (user.user_metadata?.full_name as string | undefined)?.trim();
        const initialName = metaName || emailPrefix;
        setUserName(initialName.split(" ")[0] || "there");

        const uid = user.id;

        const [profileRes, eduRes, skillsRes, projectsRes, expRes, docsRes, coachRes] = await Promise.all([
          supabase.from("profiles").select("full_name,bio").eq("id", uid).maybeSingle(),
          supabase.from("educations").select("id", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("skills").select("id", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("experiences").select("id", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("coach_sessions").select("id", { count: "exact", head: true }).eq("user_id", uid),
        ]);

        const profile = profileRes.data;
        const checks = [
          Boolean(profile?.full_name?.trim()),
          Boolean(profile?.bio?.trim()),
          (eduRes.count ?? 0) > 0,
          (skillsRes.count ?? 0) >= 3,
          (projectsRes.count ?? 0) > 0,
          (expRes.count ?? 0) > 0,
          (docsRes.count ?? 0) > 0,
        ];

        const completed = checks.filter(Boolean).length;
        const completion = Math.round((completed / checks.length) * 100);
        setProfileCompletion(completion);
        setInterviewAttempts(coachRes.count ?? 0);
        setSavedJobs(loadSavedJobs().size);

        if (profile?.full_name?.trim()) {
          setUserName(profile.full_name.trim().split(" ")[0] || "there");
        }
      } catch {
        // Keep dashboard usable even if optional insight queries fail.
      }
    }

    void loadDashboardSignals();
  }, [supabase]);

  const aiInsights = useMemo(() => {
    const profileInsight = `Your profile is ${profileCompletion}% complete.`;
    const interviewInsight =
      interviewAttempts > 0
        ? `You completed ${interviewAttempts} interview session${interviewAttempts > 1 ? "s" : ""}.`
        : "You have not practiced interviews yet.";
    const jobsInsight =
      savedJobs > 0
        ? `You already saved ${savedJobs} job${savedJobs > 1 ? "s" : ""}. Keep momentum.`
        : "No saved jobs yet. Build your shortlist from matched opportunities.";

    return [profileInsight, interviewInsight, jobsInsight];
  }, [profileCompletion, interviewAttempts, savedJobs]);

  const primarySuggestion = useMemo(() => {
    if (profileCompletion < 65) {
      return { label: "Complete Profile", href: "/dashboard/profile" };
    }
    if (interviewAttempts === 0) {
      return { label: "Start Interview Coach", href: "/dashboard/ai" };
    }
    return { label: "Explore Job Matches", href: "/dashboard/jobs" };
  }, [profileCompletion, interviewAttempts]);

  return (
    <section className="min-h-full bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[38%] w-[38%] rounded-full bg-blue-900/18 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[46%] w-[30%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-500/12 via-blue-500/8 to-purple-500/10 p-7 shadow-[0_24px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Career Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Welcome back, {userName} 👋</h1>
              <p className="mt-2 text-slate-300">Let&apos;s continue building your career journey.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.03]"
              >
                Complete Profile
              </Link>
              <Link
                href="/dashboard/ai"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:scale-[1.02] hover:border-cyan-300/45"
              >
                Practice Interview
              </Link>
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:scale-[1.02] hover:border-cyan-300/45"
              >
                Explore Jobs
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="mb-7 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Profile Completion",
              value: `${profileCompletion}%`,
              hint: profileCompletion < 70 ? "Improve profile depth" : "Strong progress",
              href: "/dashboard/profile",
              icon: User,
            },
            {
              label: "Interview Attempts",
              value: `${interviewAttempts}`,
              hint: interviewAttempts === 0 ? "Start your first session" : "Keep practicing",
              href: "/dashboard/ai",
              icon: Bot,
            },
            {
              label: "Saved Jobs",
              value: `${savedJobs}`,
              hint: savedJobs === 0 ? "Build a shortlist" : "Track and apply",
              href: "/dashboard/jobs",
              icon: Briefcase,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-cyan-300/40"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-200">
                  <Icon size={18} />
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
              </Link>
            );
          })}
        </section>

        <section className="mb-20 rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-blue-500/8 to-purple-500/10 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles size={14} /> AI Guidance
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">Recommended Next Steps</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {aiInsights.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={primarySuggestion.href}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(56,189,248,0.28)] transition-all hover:scale-[1.03]"
            >
              Start Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="relative">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Your Career Journey</h2>
            <p className="mt-4 text-slate-400">Follow the path to build your career step by step.</p>
          </div>

          <div className="absolute bottom-0 left-1/2 top-20 hidden w-[2px] -translate-x-1/2 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent opacity-30 md:block" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-20 hidden w-32 -translate-x-1/2 md:block">
            {tailSegments.map((i) => (
              <motion.div
                key={i}
                animate={{
                  top: ["0%", "100%"],
                  x: [-40, 40, -40],
                }}
                transition={{
                  top: { duration: 20, repeat: Infinity, ease: "linear", delay: i * 0.22 },
                  x: { duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.22 },
                }}
                className="absolute left-1/2 z-50 -translate-x-1/2"
                style={{
                  opacity: 0.9 - i * 0.1,
                  scale: 1 - i * 0.07,
                }}
              >
                {i === 0 ? (
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                      className="h-5 w-5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.65),0_0_32px_rgba(59,130,246,0.45)]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-1 w-1 rounded-full bg-cyan-200" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-full blur-[1px] shadow-[0_0_10px_rgba(59,130,246,0.35)] ${
                      i % 2 === 0 ? "h-4 w-4 bg-blue-400/45" : "h-3 w-3 bg-indigo-400/32"
                    }`}
                  />
                )}
              </motion.div>
            ))}
          </div>

          <div className="space-y-24 md:space-y-0">
            {journeySteps.map((step, index) => {
              const isRightAligned = index % 2 === 1;
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative flex items-center md:h-[300px]">
                  <div className="absolute left-1/2 top-1/2 z-10 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] md:block" />

                  <div
                    className={`absolute top-1/2 hidden h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent md:block ${
                      isRightAligned ? "left-1/2 w-1/4" : "right-1/2 w-1/4"
                    }`}
                  />

                  <div className={`flex w-full ${isRightAligned ? "md:justify-end" : "md:justify-start"}`}>
                    <motion.article
                      initial={{ opacity: 0, x: isRightAligned ? 50 : -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="relative w-full rounded-[30px] border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-cyan-300/35 hover:shadow-2xl md:w-[45%]"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}>
                          <Icon className="text-white" size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                      </div>

                      <p className="mt-4 leading-relaxed text-slate-400">{step.body}</p>

                      <Link
                        href={step.href}
                        className="group mt-8 inline-flex items-center gap-2 font-semibold text-blue-400 transition-colors hover:text-blue-300"
                      >
                        {step.cta}
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.article>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <Rocket size={20} />
            </div>
            <h3 className="text-xl font-semibold text-white">Our Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              To empower every job seeker in Bangladesh with AI-driven tools that bridge the gap between potential and employment.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
              <Eye size={20} />
            </div>
            <h3 className="text-xl font-semibold text-white">Our Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Building a future where career growth is structured, transparent, and accessible to everyone through technology.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
