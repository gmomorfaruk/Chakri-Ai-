"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();

  const highlights = [
    {
      title: "Career DNA Matching",
      body: "Get practical job-fit scoring from your profile skills, location preference, and target role.",
    },
    {
      title: "Interview + Learning Coach",
      body: "Practice real interview flows, voice viva, and role-focused guidance for Bangladesh job categories.",
    },
    {
      title: "Job Tracker Workspace",
      body: "Track saved jobs, applications, follow-up dates, and preparation tasks in one focused dashboard.",
    },
  ];

  const steps = [
    {
      title: "Build your profile",
      body: "Add skills, projects, education, and goals so the system understands your strengths.",
    },
    {
      title: "Match and apply smartly",
      body: "Filter jobs, score fit quickly, and track every application with reminders.",
    },
    {
      title: "Prepare and improve",
      body: "Practice with AI coach and improve response quality before interviews.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-14">
        <header className="home-fade-in flex items-center justify-between rounded-2xl border border-border/80 bg-card/60 px-4 py-3 backdrop-blur md:px-6">
          <p className="font-semibold tracking-tight">{t("appName")}</p>
          <div className="flex items-center gap-2">
            <a href="/jobs" className="rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm transition hover:bg-muted/60">
              {t("jobHub")}
            </a>
            <a href="/sign-in" className="rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm transition hover:bg-muted/60">
              {t("signIn")}
            </a>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="home-fade-in space-y-6 [animation-delay:80ms]">
            <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              Career Operating System for Bangladesh
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Prepare smarter, apply faster, and get interview-ready with one focused platform.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Chakri AI combines job discovery, matching, tracker workflows, and guided practice so you can move from confusion to consistent progress.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="/sign-up"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-16px_rgba(59,130,246,0.75)] transition hover:translate-y-[-1px] hover:bg-primary/90"
              >
                {t("signUp")}
              </a>
              <a href="/dashboard" className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-muted/70">
                Open Dashboard
              </a>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3 pt-2">
              <StatCard value="3-in-1" label="Hub + Tracker + Coach" />
              <StatCard value="Realtime" label="Live workflow updates" />
              <StatCard value="MVP Ready" label="Built for fast iteration" />
            </div>
          </div>

          <div className="home-fade-in [animation-delay:160ms]">
            <div className="relative rounded-3xl border border-border/80 bg-card/75 p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.55)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Today Focus</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Make your next career move structured and measurable.</h2>
              <div className="mt-5 space-y-3">
                <ChecklistItem text="Find approved roles by skill and location" />
                <ChecklistItem text="Track every application status cleanly" />
                <ChecklistItem text="Practice interview quality with AI feedback" />
              </div>
              <div className="mt-5 rounded-2xl border border-border/80 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested Next Step</p>
                <p className="mt-1 text-sm">Create profile + add 5 key skills to unlock better matching quality.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => (
            <article key={item.title} className="home-fade-in rounded-2xl border border-border/80 bg-card/70 p-5 [animation-fill-mode:both]" style={{ animationDelay: `${220 + index * 80}ms` }}>
              <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-border/80 bg-card/70 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">How It Works</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => (
              <article key={item.title} className="rounded-xl border border-border/80 bg-background/55 p-4">
                <p className="text-xs font-semibold tracking-wide text-primary">Step {index + 1}</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/60 p-3">
      <p className="text-base font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-sm">
      <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-primary" />
      <span>{text}</span>
    </div>
  );
}
