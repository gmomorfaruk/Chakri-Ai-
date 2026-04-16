"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const categories = [
  { icon: "💻", label: "Software Engineer", color: "#3b82f6" },
  { icon: "📊", label: "Data Analyst", color: "#06b6d4" },
  { icon: "🎨", label: "UI/UX Designer", color: "#8b5cf6" },
  { icon: "📱", label: "Mobile Developer", color: "#ec4899" },
  { icon: "🔧", label: "Network Engineer", color: "#10b981" },
  { icon: "🏦", label: "Bank Officer", color: "#f59e0b" },
  { icon: "📣", label: "Digital Marketer", color: "#ef4444" },
  { icon: "🎓", label: "Education & Teaching", color: "#a78bfa" },
  { icon: "🏥", label: "Healthcare Professional", color: "#34d399" },
  { icon: "⚙️", label: "Mechanical Engineer", color: "#60a5fa" },
  { icon: "🏗️", label: "Civil Engineer", color: "#fbbf24" },
  { icon: "📦", label: "Supply Chain & Logistics", color: "#fb923c" },
  { icon: "💬", label: "Customer Support", color: "#4ade80" },
  { icon: "👔", label: "HR & Recruitment", color: "#c084fc" },
  { icon: "📰", label: "Journalism & Media", color: "#38bdf8" },
  { icon: "🛒", label: "E-Commerce Manager", color: "#f472b6" },
  { icon: "🧪", label: "Research & Development", color: "#a3e635" },
  { icon: "🏛️", label: "Government & Public Sector", color: "#67e8f9" },
  { icon: "✈️", label: "Tourism & Hospitality", color: "#fde68a" },
  { icon: "🌾", label: "Agriculture & Agri-tech", color: "#86efac" },
];

const testimonials = [
  {
    stars: "★★★★★",
    text: "I was unemployed for 8 months. Chakri AI matched me to a role I never would have found, and the AI Coach prepared me so well that I got the offer on my first interview.",
    name: "Rakibul Islam",
    role: "Frontend Developer, Dhaka",
    color: "#3b82f6",
  },
  {
    stars: "★★★★★",
    text: "Voice Viva changed everything for me. I was terrified of spoken interviews in English. After 2 weeks of practice, I nailed my viva at a multinational company in Chittagong.",
    name: "Nusrat Jahan",
    role: "Marketing Executive, Chittagong",
    color: "#ec4899",
  },
  {
    stars: "★★★★★",
    text: "The job matching is scarily accurate. It showed me a 94% match for a role that I applied to and got within 3 weeks. My previous 6 months of applying randomly gave me nothing.",
    name: "Sabbir Ahmed",
    role: "Data Analyst, BJIT Group",
    color: "#10b981",
  },
  {
    stars: "★★★★★",
    text: "As a fresh graduate from Khulna, I had no network or connections. Chakri AI was my network. I got placed at a top NGO without knowing anyone there.",
    name: "Fatema Khatun",
    role: "Program Officer, BRAC",
    color: "#8b5cf6",
  },
  {
    stars: "★★★★★",
    text: "Job Tracker kept me sane. I was applying to 20+ places — Chakri AI helped me track everything and follow up at the right time. I stopped missing opportunities.",
    name: "Tanvir Hossain",
    role: "Civil Engineer, Rajuk",
    color: "#f59e0b",
  },
  {
    stars: "★★★★★",
    text: "I came back from abroad with no local job experience. Within 45 days on Chakri AI, I had 3 interview calls and accepted a great offer. This platform is a lifeline.",
    name: "Sadia Akter",
    role: "Product Manager, Shohoz",
    color: "#06b6d4",
  },
];

const steps = [
  { title: "Build Your Profile", desc: "Tell us your skills, experience, and goals. Our AI builds an optimized profile that gets noticed.", icon: "📝" },
  { title: "Get AI-Matched", desc: "Receive personalized job matches with compatibility scores from hundreds of live openings.", icon: "🎯" },
  { title: "Prepare with AI", desc: "Train with AI Coach and Voice Viva until you're completely confident and ready.", icon: "🤖" },
  { title: "Land the Job", desc: "Walk into every interview prepared. Track your journey and celebrate your new career.", icon: "🏆" },
];

const trustLogos = ["Grameenphone", "BRAC", "PRAN–RFL", "Dutch–Bangla", "Robi Axiata", "Square Group", "ACI Limited"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#040a14] text-[#f0f6ff] font-body">
      {/* noise / grid overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-60 mix-blend-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.12)_0%,transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.1)_0%,transparent_60%),radial-gradient(ellipse_at_10%_70%,rgba(6,182,212,0.07)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" style={{ backgroundSize: "64px 64px" }} />
      </div>

      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#040a14]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-lg font-bold">✦</div>
            <div className="leading-tight">
              <div className="font-display text-lg font-extrabold tracking-tight">
                Chakri <span className="text-blue-400">AI</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Career Platform</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#categories" className="transition hover:text-white">
              Job Sectors
            </a>
            <a href="#spotlight" className="transition hover:text-white">
              Features
            </a>
            <a href="#how" className="transition hover:text-white">
              How It Works
            </a>
            <a href="#testimonials" className="transition hover:text-white">
              Stories
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-400/60 hover:text-blue-200"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.02]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24">
        {/* Hero */}
        <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-16 pt-20 sm:px-8">
          <div className="absolute inset-0">
            <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-500/20 blur-[140px]" />
            <div className="absolute right-[-120px] top-32 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-[120px]" />
            <div className="absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-cyan-400/12 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
              <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
              Bangladesh&apos;s First AI Career Engine
            </div>
            <h1 className="hero-heading text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Your Next Job Is <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">One AI Away</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300">
              Chakri AI turns <span className="text-white font-semibold">unemployed into employed</span>. Get AI-matched to real jobs, prepare with an AI coach, and practice live voice interviews — all in one platform built for Bangladesh.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_50px_rgba(59,130,246,0.35)] transition hover:scale-[1.03]"
              >
                🚀 Start For Free
              </Link>
              <Link
                href="/ai-coach"
                className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                ▶ Watch Demo
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-center text-sm text-slate-300">
              {[
                { value: "12,000+", label: "Jobs Matched" },
                { value: "4,800+", label: "People Hired" },
                { value: "98%", label: "Satisfaction Rate" },
                { value: "500+", label: "Partner Companies" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="stats-number text-2xl text-white">{item.value}</div>
                  <div className="text-[12px] font-medium uppercase tracking-[0.15em] text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust logos */}
        <section
          id="trust"
          className="relative px-5 py-8 sm:px-8"
          aria-label="Trusted by leading employers across Bangladesh"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,132,255,0.08),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-xl border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] backdrop-blur-lg shadow-[0_8px_26px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-3 border-b border-white/10 sm:flex-row sm:items-center sm:justify-between px-5 pb-4 pt-5 sm:px-7">
                <div className="label-text text-[11px] uppercase tracking-[0.26em] text-slate-100/85">
                  Trusted by leading employers across Bangladesh
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3.5 py-1.5 text-[12px] font-medium text-slate-100/90 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/90 animate-pulse" />
                  500+ verified employer partners
                </div>
              </div>

              <div className="grid gap-2 px-5 py-4 sm:px-7">
                <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-slate-100/85">
                  {trustLogos.map((logo, idx) => (
                    <span
                      key={logo}
                      className="relative flex items-center gap-2 px-2 py-1 transition text-slate-100/85 hover:text-white"
                    >
                      {logo}
                      {idx !== trustLogos.length - 1 && <span className="hidden h-3.5 w-px bg-white/12 sm:block" aria-hidden />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Job categories slider */}
        <section id="categories" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-blue-400">Explore Opportunities</span>
            <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">Find Your Perfect Sector</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-300">
              From tech startups to government roles — we match you across every major industry in Bangladesh.
            </p>
          </div>
          <div className="mt-10 space-y-4 overflow-hidden">
            {[0, 1].map((row) => (
              <div key={row} className="relative">
                <motion.div
                  className="flex gap-3"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ repeat: Infinity, duration: 30, ease: "linear", repeatType: "loop" }}
                  style={{ direction: row === 1 ? "rtl" : "ltr" }}
                >
                  {[...categories, ...categories].map((cat, idx) => (
                    <div
                      key={`${cat.label}-${idx}-${row}`}
                      className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#0b1525] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition hover:scale-[1.03]"
                      style={{ borderColor: `${cat.color}33` }}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `${cat.color}20` }}>
                        {cat.icon}
                      </span>
                      {cat.label}
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </section>

        {/* Pain → solution */}
        <section id="solution" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-blue-400">Why Chakri AI</span>
            <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">We Solve the Real Problems</h2>
            <p className="mt-3 text-base text-slate-300">Job hunting in Bangladesh is broken. We fixed it.</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
            <div className="relative rounded-2xl border border-red-400/30 bg-[#0b1525] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <div className="mb-5 text-[12px] font-medium uppercase tracking-[0.2em] text-red-400">❌ Without Chakri AI</div>
              {[
                "Sending hundreds of CVs with zero responses — wasting months with no feedback.",
                "No idea which jobs match your actual skills — applying blindly everywhere.",
                "Walking into interviews unprepared — not knowing what questions to expect.",
                "Losing track of applications — missing follow-ups and deadlines regularly.",
                "Nervous about spoken interviews — no way to practice before the real thing.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 border-b border-white/5 py-3 text-sm text-slate-300 last:border-0">
                  <span className="text-lg">😓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl border border-emerald-400/30 bg-[#0b1525] p-8 shadow-[0_20px_60px_rgba(16,185,129,0.2)]">
              <div className="mb-5 text-[12px] font-medium uppercase tracking-[0.2em] text-emerald-300">✅ With Chakri AI</div>
              {[
                "AI matches your profile to the right jobs instantly — with a compatibility score.",
                "AI Coach prepares you for every interview with role-specific Q&A training.",
                "Voice Viva simulates real spoken interviews so you walk in with full confidence.",
                "Job Tracker keeps every application organized — deadlines, statuses, follow-ups.",
                "Continuous AI feedback improves your profile performance after every attempt.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 border-b border-white/5 py-3 text-sm text-slate-200 last:border-0">
                  <span className="text-lg text-emerald-300">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature spotlight */}
        <section id="spotlight" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-blue-400">Powered by AI</span>
            <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">Built to Get You Hired</h2>
            <p className="mt-3 text-base text-slate-300">Three features that change everything about your job search.</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-2">
            {/* AI Coach featured */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1525] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="grid gap-0 lg:grid-cols-2">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1c30] to-[#0f2040] p-8">
                  <div className="absolute right-6 top-6 rounded-lg border border-blue-400/40 bg-blue-400/15 px-3 py-2 text-[11px] font-medium text-cyan-100">
                    ⚡ Live Session
                  </div>
                  <div className="flex flex-col gap-3 text-sm text-slate-200">
                    <div className="w-full max-w-xs rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3">
                      👋 I&apos;m your AI Coach. What role are you preparing for?
                    </div>
                    <div className="ml-auto w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
                      Software Engineer at a Bangladeshi tech company
                    </div>
                    <div className="w-full max-w-xs rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3">
                      Perfect! Here&apos;s your first question: <strong>Tell me about yourself in 2 minutes.</strong> Remember to highlight your technical skills and achievements.
                    </div>
                    <div className="mt-1 flex w-fit items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4 p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">🤖</div>
                  <h3 className="card-title text-2xl font-semibold text-white">AI Interview Coach</h3>
                  <p className="text-sm text-slate-300">
                    Practice unlimited mock interviews, get instant feedback on your answers, and refine your strategy before the real interview. Trained on thousands of real Bangladesh job interviews.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    {["Role-specific questions", "Real-time feedback", "Performance scoring"].map((chip) => (
                      <span key={chip} className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-cyan-100">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <Link href="/ai-coach" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">
                    Try AI Coach →
                  </Link>
                </div>
              </div>
            </div>

            {/* Matching + Viva cards */}
            <div className="grid gap-6">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1525] shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="bg-gradient-to-br from-[#0d1c30] to-[#0f2040] p-6">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Top Matches For You</div>
                    <div className="mt-4 flex flex-col gap-3">
                      {[
                        { role: "Frontend Developer", company: "BJIT Ltd. · Dhaka", score: "96%", color: "#3b82f6", icon: "💻" },
                        { role: "Data Analyst", company: "Brain Station 23", score: "88%", color: "#10b981", icon: "📊" },
                        { role: "UX Designer", company: "Kaz Software", score: "82%", color: "#8b5cf6", icon: "🎨" },
                      ].map((item) => (
                        <div
                          key={item.role}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:border-blue-400/40"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}30` }}>
                            {item.icon}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold">{item.role}</div>
                            <div className="text-[12px] text-slate-400">{item.company}</div>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[12px] font-medium text-emerald-300">{item.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-xl">🎯</div>
                    <h3 className="card-title text-xl font-semibold text-white">Smart Job Matching</h3>
                    <p className="text-sm text-slate-300">
                      Stop guessing. Our AI scores every job against your skills and shows you exactly where you fit best across hundreds of live openings.
                    </p>
                    <Link href="/jobs/matching" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200">
                      Explore Matches →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1525] shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="bg-gradient-to-br from-[#0d1c30] to-[#0f2040] p-6">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Live Voice Practice</div>
                    <div className="mt-4 flex flex-col items-center gap-4">
                      <div className="flex items-end gap-1">
                        {[12, 20, 35, 50, 42, 28, 48, 38, 55, 32, 44, 22, 40, 30, 52, 18, 36, 26, 45, 24].map((h, idx) => (
                          <div key={idx} className="w-1 bg-gradient-to-t from-pink-500 to-violet-400" style={{ height: `${h}px`, borderRadius: "999px" }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-pink-400/30 bg-pink-400/10 px-4 py-3 text-sm text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/30 font-semibold">84%</div>
                        <div>
                          <div className="font-semibold">Confidence Score</div>
                          <div className="text-[12px] text-slate-300">Clarity · Pace · Tone · Fluency</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-xl">🎙️</div>
                    <h3 className="card-title text-xl font-semibold text-white">Voice Viva</h3>
                    <p className="text-sm text-slate-300">
                      Practice spoken interviews out loud. Our AI listens, scores your confidence and clarity, and helps you speak with authority on the real day.
                    </p>
                    <Link href="/ai-coach/viva" className="inline-flex items-center gap-2 text-sm font-semibold text-pink-200">
                      Start Speaking →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-blue-400">Simple Process</span>
            <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">From Zero to Hired in 4 Steps</h2>
            <p className="mt-3 text-base text-slate-300">We guide you through every stage — no confusion, no guesswork.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={step.title} className="group relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/15 bg-[#0b1525] text-lg text-blue-300 transition group-hover:border-blue-400 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  {step.icon}
                </div>
                <div className="card-title text-lg font-semibold text-white">{step.title}</div>
                <p className="mt-2 text-sm text-slate-300">{step.desc}</p>
                <div className="pointer-events-none absolute inset-x-10 top-8 hidden h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent md:block" />
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="overflow-hidden px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-blue-400">Real Stories</span>
            <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">People Who Got Hired</h2>
            <p className="mt-3 text-base text-slate-300">Join thousands of Bangladeshis who changed their lives with Chakri AI.</p>
          </div>
          <div className="mt-10">
            <motion.div
              className="flex gap-4"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            >
              {[...testimonials, ...testimonials].map((t, idx) => (
                <div key={`${t.name}-${idx}`} className="w-80 shrink-0 rounded-2xl border border-white/12 bg-[#0b1525] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
                  <div className="mb-3 text-xs tracking-[0.2em] text-amber-300">{t.stars}</div>
                  <p className="text-sm text-slate-300">“{t.text}”</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${t.color}30`, color: t.color }}>
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-[12px] text-slate-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="px-5 pb-24 sm:px-8">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1525] px-8 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
            <div className="pointer-events-none absolute inset-x-1/4 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
              <div className="relative">
                <h2 className="section-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your Career Starts <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Right Now</span>
                </h2>
                <p className="mt-3 text-base text-slate-300">
                  Stop waiting. Thousands of jobs are waiting for someone with your skills. Chakri AI helps you find and land them faster than ever.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/sign-up"
                    className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_50px_rgba(59,130,246,0.35)] transition hover:scale-[1.03]"
                  >
                    🚀 Get Started — It&apos;s Free
                  </Link>
                </div>
              <div className="mt-4 text-[12px] text-slate-400">No credit card required · Works on mobile · Bengali &amp; English supported</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-display flex items-center gap-3 text-base font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-sm">✦</span>
            Chakri <span className="text-blue-400">AI</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {["About", "Features", "For Employers", "Privacy", "Contact"].map((item) => (
              <a key={item} href="#" className="transition hover:text-white">
                {item}
              </a>
            ))}
          </div>
          <div className="text-[12px] text-slate-500">© {new Date().getFullYear()} Chakri AI · Made with ❤️ in Bangladesh</div>
        </div>
      </footer>
    </div>
  );
}
