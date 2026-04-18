"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, MapPin, Radar, Search, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { buildSavedJobKey, loadSavedJobs, saveSavedJobs, toggleSavedJob } from "@/lib/savedJobsStore";
import { Job } from "@/types/jobs";

type JobsApiResponse = {
  jobs?: Job[];
  error?: string;
};

type JobWithOptionalUrls = Job & {
  apply_url?: string | null;
  url?: string | null;
};

export function JobHubModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const [savingByJobId, setSavingByJobId] = useState<Record<string, boolean>>({});

  const normalizeUrl = (url: string | null | undefined) => {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const getJobLink = (job: JobWithOptionalUrls) => {
    return normalizeUrl(job.source_url || job.apply_url || job.url || "");
  };

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSavedJobIds(loadSavedJobs());
  }, []);

  useEffect(() => {
    saveSavedJobs(savedJobIds);
  }, [savedJobIds]);

  async function loadJobs() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (location.trim()) params.set("location", location.trim());
    if (skill.trim()) params.set("skill", skill.trim());

    const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
    const payload = (await res.json().catch(() => null)) as JobsApiResponse | null;

    if (!res.ok) {
      setJobs([]);
      setError(payload?.error || "Failed to load jobs");
      setLoading(false);
      return;
    }

    setJobs(payload?.jobs ?? []);
    setLoading(false);
  }

  async function saveOrApply(job: Job, action: "save" | "apply") {
    if (action === "save") {
      const key = buildSavedJobKey(job.id, "job");
      setSavedJobIds((prev) => {
        return toggleSavedJob(prev, key);
      });
      return;
    }

    // Open external link if we have one
    const targetLink = getJobLink(job);
    if (targetLink) {
      window.open(targetLink, "_blank", "noopener,noreferrer");
    }
    if (!targetLink) {
      setError(t("applyUrl") || "Apply URL is missing for this job.");
    }

    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      // If not signed in, we still open the link (above) and show a gentle error.
      setError(t("profileAuthRequired"));
      return;
    }

    setSavingByJobId((prev) => ({ ...prev, [job.id]: true }));
    setError(null);

    const { data: existing, error: existingError } = await supabase
      .from("job_applications")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("role_title", job.title)
      .eq("company", job.company)
      .limit(1);

    if (!existingError && (existing?.length ?? 0) > 0) {
      setSavingByJobId((prev) => ({ ...prev, [job.id]: false }));
      setError(t("jobAlreadyTracked"));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    // Primary path: tracker schema (role_title/company/applied_at)
    const { error: trackerInsertError } = await supabase.from("job_applications").insert({
      user_id: authData.user.id,
      job_post_id: null,
      role_title: job.title,
      company: job.company,
      status: "applied",
      applied_at: today,
      follow_up_date: null,
      notes: null,
      ai_followup_draft: null,
    });

    if (!trackerInsertError) {
      setSavingByJobId((prev) => ({ ...prev, [job.id]: false }));
      return;
    }

    // Fallback path: legacy MVP schema (job_id/applied_date)
    const { error: fallbackInsertError } = await supabase.from("job_applications").insert({
      user_id: authData.user.id,
      job_id: job.id,
      status: "applied",
      applied_date: today,
    });

    setSavingByJobId((prev) => ({ ...prev, [job.id]: false }));

    if (fallbackInsertError) {
      if (trackerInsertError.code === "23505" || fallbackInsertError.code === "23505") {
        setError(t("jobAlreadyTracked"));
      } else {
        setError(fallbackInsertError.message || trackerInsertError.message);
      }
      return;
    }
  }

  const locationOptions = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.location?.trim()).filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const skillOptions = useMemo(
    () => Array.from(new Set(jobs.flatMap((j) => j.required_skills || []).map((s) => s.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const jobsByCompany = useMemo(() => new Set(jobs.map((item) => item.company)).size, [jobs]);
  const remoteCount = useMemo(
    () => jobs.filter((item) => (item.location || "").toLowerCase().includes("remote")).length,
    [jobs]
  );
  const savedCountInView = useMemo(
    () => jobs.filter((item) => savedJobIds.has(buildSavedJobKey(item.id, "job"))).length,
    [jobs, savedJobIds]
  );
  const featuredSkillPills = useMemo(() => skillOptions.slice(0, 8), [skillOptions]);

  return (
    <main className="relative mx-auto max-w-7xl overflow-hidden px-4 py-8 sm:py-10 md:py-12">
      <div className="pointer-events-none absolute -left-32 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-52 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative space-y-5 md:space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br from-card/95 via-card to-background/90 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)] sm:p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Opportunity Control Room
              </div>
              <h1
                className="mt-4 bg-gradient-to-r from-sky-200 via-cyan-200 to-teal-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl"
                style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}
              >
                {t("jobHub")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t("jobHubHint")}</p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
              {[
                { label: "Open roles", value: loading ? "..." : String(jobs.length), icon: <BriefcaseBusiness className="h-4 w-4" /> },
                { label: "Companies", value: loading ? "..." : String(jobsByCompany), icon: <Building2 className="h-4 w-4" /> },
                { label: "Remote", value: loading ? "..." : String(remoteCount), icon: <Radar className="h-4 w-4" /> },
                { label: "Saved", value: String(savedCountInView), icon: <BookmarkCheck className="h-4 w-4" /> },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{card.label}</span>
                    <span className="text-primary">{card.icon}</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

        <section className="rounded-[26px] border border-border/60 bg-card/85 p-4 shadow-[0_16px_45px_rgba(2,6,23,0.25)] backdrop-blur-sm sm:p-5">
          <div className="grid gap-2 md:grid-cols-4">
            <label className="relative md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border/70 bg-background/80 py-2.5 pl-9 pr-3 text-sm transition focus:border-primary/45 focus:outline-none"
                placeholder={t("searchByTitle")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm transition focus:border-primary/45 focus:outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">{t("allLocations")}</option>
              {locationOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm transition focus:border-primary/45 focus:outline-none"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
              <option value="">{t("allSkills")}</option>
              {skillOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl bg-gradient-to-r from-primary to-cyan-500 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_rgba(56,189,248,0.25)] transition hover:brightness-110"
              onClick={() => void loadJobs()}
            >
              {t("applyFilters")}
            </button>
          </div>

          {featuredSkillPills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {featuredSkillPills.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSkill(item)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    skill === item
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  #{item}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 text-sm text-muted-foreground">{t("loading")}</div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 text-sm text-muted-foreground">{t("emptyApprovedJobs")}</div>
          ) : (
            jobs.map((job) => {
              const isSaved = savedJobIds.has(buildSavedJobKey(job.id, "job"));
              return (
                <article
                  key={job.id}
                  className="group flex h-full flex-col rounded-3xl border border-border/65 bg-gradient-to-br from-card to-background/95 p-5 shadow-[0_14px_40px_rgba(2,6,23,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_55px_rgba(14,165,233,0.2)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold leading-tight text-foreground" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                        {job.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        <BookmarkCheck className="h-3.5 w-3.5" />
                        Saved
                      </span>
                    ) : null}
                  </div>

                  {job.location ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(job.required_skills || []).length === 0 ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{t("none")}</span>
                    ) : (
                      (job.required_skills || []).slice(0, 6).map((item) => (
                        <span
                          key={`${job.id}-${item}`}
                          className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200"
                        >
                          {item}
                        </span>
                      ))
                    )}
                  </div>

                  <p className="mt-4 line-clamp-5 text-sm leading-6 text-muted-foreground">{job.description}</p>

                  <div className="mt-5 flex gap-2">
                    <button
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        isSaved
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-border/70 bg-background/70 text-foreground hover:border-primary/35"
                      }`}
                      disabled={Boolean(savingByJobId[job.id])}
                      onClick={() => void saveOrApply(job, "save")}
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      {isSaved ? "Saved" : t("save")}
                    </button>
                    <button
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-cyan-500 px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_rgba(56,189,248,0.25)] transition hover:brightness-110"
                      disabled={Boolean(savingByJobId[job.id])}
                      onClick={() => void saveOrApply(job, "apply")}
                    >
                      {t("applyNow")}
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
