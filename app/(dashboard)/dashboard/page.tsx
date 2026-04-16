"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bell, Bot, Briefcase, Eye, ListTodo, Rocket, User } from "lucide-react";

const features = [
  {
    title: "Profile",
    body: "Build your professional identity with skills, experience, projects, and public portfolio settings.",
    cta: "Open Profile",
    href: "/dashboard/profile",
    icon: User,
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Jobs",
    body: "Manage your full opportunity pipeline from hub, tracker, matching, and result views in one place.",
    cta: "Open Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase,
    color: "from-blue-500 to-indigo-400",
  },
  {
    title: "AI Career Coach",
    body: "Practice interviews, switch coaching modes, and train with conversational and voice guidance.",
    cta: "Open AI Coach",
    href: "/dashboard/ai",
    icon: Bot,
    color: "from-purple-500 to-fuchsia-400",
  },
  {
    title: "Tasks",
    body: "Create practical roadmaps, prioritize task execution, and monitor completion momentum.",
    cta: "Open Tasks",
    href: "/dashboard/tasks",
    icon: ListTodo,
    color: "from-emerald-500 to-teal-400",
  },
  {
    title: "Notifications",
    body: "Track alerts, activity logs, and updates so nothing important gets missed.",
    cta: "Open Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    color: "from-amber-500 to-orange-400",
  },
];

const tailSegments = [0, 1, 2, 3, 4, 5, 6];

export default function DashboardHome() {
  return (
    <section className="min-h-full bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[30%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <section className="mb-24 grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:border-blue-500/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
              <Rocket size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Mission</h2>
            <p className="mt-3 leading-relaxed text-slate-400">
              To empower every job seeker in Bangladesh with AI-driven tools that bridge the gap between potential and employment.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:border-purple-500/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400">
              <Eye size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Vision</h2>
            <p className="mt-3 leading-relaxed text-slate-400">
              Building a future where career growth is structured, transparent, and accessible to everyone through technology.
            </p>
          </div>
        </section>

        <section className="relative">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Core Features</h2>
            <p className="mt-4 text-slate-400">Professional tab flow for daily execution.</p>
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
              const isRightAligned = index % 2 === 1;
              const Icon = feature.icon;

              return (
                <div key={feature.title} className="relative flex items-center md:h-[300px]">
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
                      className="relative w-full rounded-[32px] border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl md:w-[45%]"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                          <Icon className="text-white" size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                      </div>

                      <p className="mt-4 leading-relaxed text-slate-400">{feature.body}</p>

                      <Link
                        href={feature.href}
                        className="group mt-8 inline-flex items-center gap-2 font-semibold text-blue-400 transition-colors hover:text-blue-300"
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
    </section>
  );
}
