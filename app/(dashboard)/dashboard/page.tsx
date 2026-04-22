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

const globalJobMarkers = [
  { city: "Vancouver", x: 302, y: 124, delay: 0.08 },
  { city: "Seattle", x: 309, y: 132, delay: 0.14 },
  { city: "San Francisco", x: 306, y: 145, delay: 0.2 },
  { city: "Los Angeles", x: 311, y: 156, delay: 0.26 },
  { city: "Toronto", x: 326, y: 133, delay: 0.32 },
  { city: "New York", x: 338, y: 141, delay: 0.38 },
  { city: "Mexico City", x: 329, y: 173, delay: 0.44 },
  { city: "Bogota", x: 343, y: 193, delay: 0.5 },
  { city: "Lima", x: 349, y: 212, delay: 0.56 },
  { city: "Sao Paulo", x: 366, y: 225, delay: 0.62 },
  { city: "Buenos Aires", x: 362, y: 246, delay: 0.68 },
  { city: "London", x: 406, y: 118, delay: 0.74 },
  { city: "Paris", x: 413, y: 124, delay: 0.8 },
  { city: "Berlin", x: 420, y: 122, delay: 0.86 },
  { city: "Madrid", x: 407, y: 136, delay: 0.92 },
  { city: "Lagos", x: 418, y: 184, delay: 0.98 },
  { city: "Nairobi", x: 433, y: 196, delay: 1.04 },
  { city: "Cairo", x: 431, y: 161, delay: 1.1 },
  { city: "Johannesburg", x: 432, y: 228, delay: 1.16 },
  { city: "Dubai", x: 447, y: 151, delay: 1.22 },
  { city: "Karachi", x: 458, y: 160, delay: 1.28 },
  { city: "Mumbai", x: 467, y: 171, delay: 1.34 },
  { city: "Dhaka", x: 476, y: 167, delay: 1.4 },
  { city: "Bangkok", x: 489, y: 179, delay: 1.46 },
  { city: "Singapore", x: 502, y: 189, delay: 1.52 },
  { city: "Hong Kong", x: 506, y: 160, delay: 1.58 },
  { city: "Seoul", x: 517, y: 142, delay: 1.64 },
  { city: "Tokyo", x: 525, y: 150, delay: 1.7 },
  { city: "Jakarta", x: 509, y: 203, delay: 1.76 },
  { city: "Sydney", x: 530, y: 236, delay: 1.82 },
];

export default function DashboardHome() {
  const supabase = useSupabase();
  const [userName, setUserName] = useState("there");
  const [profileCompletion, setProfileCompletion] = useState(40);
  const [interviewAttempts, setInterviewAttempts] = useState(0);
  const [savedJobs, setSavedJobs] = useState(0);
  const [timelineYear, setTimelineYear] = useState(2023);
  const [timelinePeople, setTimelinePeople] = useState(48200);

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

  const miniSignals = useMemo(() => {
    const interviewSignal = Math.min(100, interviewAttempts * 18 + (interviewAttempts > 0 ? 22 : 0));
    const savedJobsSignal = Math.min(100, savedJobs * 15 + (savedJobs > 0 ? 18 : 0));
    const readiness = Math.min(100, Math.round(profileCompletion * 0.6 + interviewSignal * 0.25 + savedJobsSignal * 0.15));

    const years = [2023, 2024, 2025, 2026];
    const peopleTrend = [58, 74, 67, 100];
    const chartStartX = 12;
    const chartEndX = 224;
    const chartTopY = 14;
    const chartBaseY = 80;
    const step = (chartEndX - chartStartX) / (peopleTrend.length - 1);

    const points = peopleTrend
      .map((value, index) => {
        const x = Math.round(chartStartX + index * step);
        const y = chartBaseY - Math.round((value / 100) * (chartBaseY - chartTopY));
        return `${x},${y}`;
      })
      .join(" ");

    const areaPoints = `${chartStartX},${chartBaseY} ${points} ${chartEndX},${chartBaseY}`;
    const yearTicks = years.map((year, index) => ({
      year,
      x: Math.round(chartStartX + step * index),
    }));
    const peakY = chartBaseY - Math.round((peopleTrend[peopleTrend.length - 1] / 100) * (chartBaseY - chartTopY));
    const peakYear = years[peopleTrend.indexOf(Math.max(...peopleTrend))] ?? years[years.length - 1];

    return {
      readiness,
      years,
      points,
      areaPoints,
      yearTicks,
      chartStartX,
      chartEndX,
      chartBaseY,
      peakY,
      peakYear,
      yearStart: years[0],
      yearEnd: 2026,
      peopleStart: 48200,
      peopleNow: 128400,
    };
  }, [interviewAttempts, profileCompletion, savedJobs]);

  const cardProgress = useMemo(() => {
    const interview = Math.min(100, interviewAttempts * 20 + (interviewAttempts > 0 ? 12 : 0));
    const jobs = Math.min(100, savedJobs * 16 + (savedJobs > 0 ? 10 : 0));

    return {
      interview,
      jobs,
    };
  }, [interviewAttempts, savedJobs]);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 120;

    const timer = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - progress, 3);

      setTimelineYear(Math.round(miniSignals.yearStart + (miniSignals.yearEnd - miniSignals.yearStart) * eased));
      setTimelinePeople(Math.round(miniSignals.peopleStart + (miniSignals.peopleNow - miniSignals.peopleStart) * eased));

      if (frame >= totalFrames) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [miniSignals.peopleNow, miniSignals.peopleStart, miniSignals.yearEnd, miniSignals.yearStart]);

  return (
    <section className="min-h-full bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[38%] w-[38%] rounded-full bg-blue-900/18 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[46%] w-[30%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 md:py-7">
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

            <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/12 via-blue-500/10 to-violet-500/10 p-4 shadow-[0_14px_36px_rgba(14,116,144,0.2)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/90">Chakri Pulse</p>
                <span className="rounded-full border border-cyan-200/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                  {miniSignals.readiness}% readiness
                </span>
              </div>

              <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-cyan-300/20 bg-[#050d1a]/85 p-3 shadow-[inset_0_0_30px_rgba(56,189,248,0.12),0_12px_32px_rgba(2,8,23,0.42)]">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">GLOBAL JOB GLOBE</p>
                    <span className="rounded-full border border-rose-400/35 bg-[#3b0f18]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      WORLDWIDE OPENINGS
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-cyan-300/15 bg-[radial-gradient(ellipse_at_center,rgba(24,58,96,0.35)_0%,rgba(5,13,26,0.98)_68%)]">
                      <svg viewBox="0 0 760 320" role="img" aria-label="Global job coverage with active locations" className="h-56 w-full md:h-60">
                      <defs>
                        <radialGradient id="globe-fill" cx="50%" cy="45%" r="62%">
                          <stop offset="0%" stopColor="#16466f" />
                          <stop offset="100%" stopColor="#0a2a4a" />
                        </radialGradient>
                        <radialGradient id="atmosphere-halo" cx="50%" cy="50%" r="70%">
                          <stop offset="62%" stopColor="rgba(125,211,252,0)" />
                          <stop offset="80%" stopColor="rgba(125,211,252,0.16)" />
                          <stop offset="100%" stopColor="rgba(125,211,252,0)" />
                        </radialGradient>
                        <clipPath id="globe-clip">
                          <circle cx="380" cy="160" r="132" />
                        </clipPath>
                        <filter id="marker-glow" x="-200%" y="-200%" width="400%" height="400%">
                          <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#ff3333" floodOpacity="0.55" />
                        </filter>
                      </defs>

                      <circle cx="380" cy="160" r="150" fill="url(#atmosphere-halo)" />

                      <g>
                        <circle cx="380" cy="160" r="132" fill="url(#globe-fill)" stroke="rgba(148,163,184,0.3)" strokeWidth="1.2" />
                        <circle cx="380" cy="160" r="134" fill="none" stroke="rgba(125,211,252,0.18)" strokeWidth="2" />

                        <g opacity="0.95" stroke="rgba(100,180,255,0.15)" fill="none">
                          <ellipse cx="380" cy="160" rx="132" ry="132" />
                          <ellipse cx="380" cy="160" rx="112" ry="132" />
                          <ellipse cx="380" cy="160" rx="86" ry="132" />
                          <ellipse cx="380" cy="160" rx="58" ry="132" />
                          <ellipse cx="380" cy="160" rx="132" ry="26" />
                          <ellipse cx="380" cy="160" rx="132" ry="52" />
                          <ellipse cx="380" cy="160" rx="132" ry="82" />
                          <ellipse cx="380" cy="160" rx="132" ry="106" />
                        </g>

                        <g clipPath="url(#globe-clip)">
                          <motion.g animate={{ x: [0, -264] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                            {[0, 264].map((offset) => (
                              <g key={offset} transform={`translate(${offset} 0)`}>
                                <path
                                  d="M286 102 302 86 324 80 342 88 353 102 349 124 332 136 311 137 292 126Z"
                                  fill="#1a5c8a"
                                />
                                <path
                                  d="M325 146 342 164 349 191 344 216 334 238 320 222 318 194Z"
                                  fill="#1a5c8a"
                                />
                                <path
                                  d="M398 102 417 92 438 98 449 112 446 127 430 136 411 133 400 120Z"
                                  fill="#1a5c8a"
                                />
                                <path
                                  d="M406 147 421 143 434 154 439 176 431 200 419 216 405 201 401 176Z"
                                  fill="#1a5c8a"
                                />
                                <path
                                  d="M444 116 470 108 498 113 522 127 534 146 532 166 514 179 488 181 462 168 448 150Z"
                                  fill="#1a5c8a"
                                />
                                <path
                                  d="M490 198 514 194 535 206 527 226 505 235 486 223Z"
                                  fill="#1a5c8a"
                                />

                                {globalJobMarkers.map((marker) => (
                                  <g key={`${marker.city}-${offset}`}>
                                    <motion.circle
                                      cx={marker.x}
                                      cy={marker.y}
                                      r="12"
                                      fill="rgba(255,51,51,0.22)"
                                      initial={{ scale: 0.45, opacity: 0.18 }}
                                      animate={{ scale: [0.6, 1.45, 0.6], opacity: [0.2, 0.7, 0.2] }}
                                      transition={{ duration: 1.8, repeat: Infinity, delay: marker.delay }}
                                    />
                                    <motion.circle
                                      cx={marker.x}
                                      cy={marker.y}
                                      r="5"
                                      fill="rgba(255,80,80,0.35)"
                                      animate={{ opacity: [0.22, 0.92, 0.22] }}
                                      transition={{ duration: 1.3, repeat: Infinity, delay: marker.delay / 2 }}
                                    />
                                    <circle cx={marker.x} cy={marker.y} r="2.9" fill="#ff3333" filter="url(#marker-glow)" />
                                  </g>
                                ))}
                              </g>
                            ))}
                          </motion.g>

                          {/* Day/night shading keeps depth while map texture scrolls */}
                          <ellipse cx="434" cy="160" rx="96" ry="132" fill="rgba(3,8,18,0.3)" />
                          <ellipse cx="322" cy="160" rx="84" ry="132" fill="rgba(255,255,255,0.04)" />
                        </g>
                      </g>
                      </svg>
                  </div>

                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    GLOBAL COVERAGE IS ACTIVE: RED BLINKING MARKERS INDICATE LIVE HIRING ZONES.
                  </p>
                </div>

                <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#020b18]/80 p-3 lg:min-h-[344px]">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">People count vs year</p>
                    <p className="text-xs text-cyan-100/90">
                      <span className="font-semibold text-white">{timelinePeople.toLocaleString()}</span> people by {timelineYear}
                    </p>
                  </div>

                  <svg viewBox="0 0 236 112" role="img" aria-label="People growth from 2023 to 2026" className="h-52 w-full md:h-56">
                    <defs>
                      <linearGradient id="pulse-line" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="50%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#e879f9" />
                      </linearGradient>
                      <linearGradient id="pulse-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(96,165,250,0.3)" />
                        <stop offset="100%" stopColor="rgba(96,165,250,0.02)" />
                      </linearGradient>
                    </defs>
                    <line x1="12" y1="16" x2="224" y2="16" stroke="rgba(148,163,184,0.22)" strokeDasharray="3 5" />
                    <line x1="12" y1="38" x2="224" y2="38" stroke="rgba(148,163,184,0.18)" strokeDasharray="3 5" />
                    <line x1="12" y1="60" x2="224" y2="60" stroke="rgba(148,163,184,0.14)" strokeDasharray="3 5" />
                    <line
                      x1={miniSignals.chartStartX}
                      y1={miniSignals.chartBaseY}
                      x2={miniSignals.chartEndX}
                      y2={miniSignals.chartBaseY}
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <motion.polygon
                      points={miniSignals.areaPoints}
                      fill="url(#pulse-area)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                    />
                    <motion.polyline
                      fill="none"
                      stroke="url(#pulse-line)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={miniSignals.points}
                      initial={{ pathLength: 0, opacity: 0.4 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 2.4, ease: "easeOut" }}
                    />
                    <motion.circle
                      cx="224"
                      cy={miniSignals.peakY}
                      r="3.5"
                      fill="#f5d0fe"
                      initial={{ scale: 0.4, opacity: 0.3 }}
                      animate={{ scale: [0.8, 1.2, 0.9], opacity: [0.6, 1, 0.85] }}
                      transition={{ duration: 1.4, repeat: Infinity, repeatType: "mirror" }}
                    />
                    {miniSignals.yearTicks.map((tick) => (
                      <text
                        key={tick.year}
                        x={tick.x}
                        y="102"
                        fill="rgba(148,163,184,0.95)"
                        fontSize="6.2"
                        letterSpacing="1.2"
                        textAnchor={
                          tick.x === miniSignals.chartStartX
                            ? "start"
                            : tick.x === miniSignals.chartEndX
                              ? "end"
                              : "middle"
                        }
                      >
                        {tick.year}
                      </text>
                    ))}
                  </svg>
                  <p className="mt-auto pt-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">Momentum snapshot: peak in {miniSignals.peakYear}</p>
                </div>
              </div>
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
              progress: profileCompletion,
              progressClass: "from-cyan-400 via-sky-400 to-blue-400",
              href: "/dashboard/profile",
              icon: User,
            },
            {
              label: "Interview Attempts",
              value: `${interviewAttempts}`,
              hint: interviewAttempts === 0 ? "Start your first session" : "Keep practicing",
              progress: cardProgress.interview,
              progressClass: "from-violet-400 via-fuchsia-400 to-pink-400",
              href: "/dashboard/ai",
              icon: Bot,
            },
            {
              label: "Saved Jobs",
              value: `${savedJobs}`,
              hint: savedJobs === 0 ? "Build a shortlist" : "Track and apply",
              progress: cardProgress.jobs,
              progressClass: "from-emerald-400 via-teal-400 to-cyan-400",
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
                <div className="mt-4 h-1.5 rounded-full bg-slate-800/90">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${item.progressClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
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
