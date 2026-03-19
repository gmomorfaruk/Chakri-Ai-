"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Job } from "@/types/jobs";

type JobsApiResponse = {
  jobs?: Job[];
  error?: string;
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

  const [savingByJobId, setSavingByJobId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function saveOrApply(job: Job, status: "saved" | "applied") {
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError(t("profileAuthRequired"));
      return;
    }

    setSavingByJobId((prev) => ({ ...prev, [job.id]: true }));
    setError(null);

    const { error: insertError } = await supabase.from("job_applications").insert({
      user_id: authData.user.id,
      job_id: job.id,
      status,
      applied_date: status === "applied" ? new Date().toISOString().slice(0, 10) : null,
    });

    setSavingByJobId((prev) => ({ ...prev, [job.id]: false }));

    if (insertError) {
      if (insertError.code === "23505") {
        setError(t("jobAlreadyTracked"));
      } else {
        setError(insertError.message);
      }
      return;
    }

    if (status === "applied" && job.source_url) {
      window.open(job.source_url, "_blank", "noopener,noreferrer");
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t("jobHub")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("jobHubHint")}</p>
      </header>

      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className="rounded-lg border border-border bg-background px-3 py-2"
            placeholder={t("searchByTitle")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
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
            className="rounded-lg border border-border bg-background px-3 py-2"
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
          <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={() => void loadJobs()}>
            {t("applyFilters")}
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("loading")}</div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("emptyApprovedJobs")}</div>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
              <p className="font-semibold text-base">{job.title}</p>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              {job.location ? <p className="mt-1 text-xs text-muted-foreground">{job.location}</p> : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(job.required_skills || []).length === 0 ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{t("none")}</span>
                ) : (
                  (job.required_skills || []).map((item) => (
                    <span key={`${job.id}-${item}`} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {item}
                    </span>
                  ))
                )}
              </div>

              <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">{job.description}</p>

              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  disabled={Boolean(savingByJobId[job.id])}
                  onClick={() => void saveOrApply(job, "saved")}
                >
                  {t("save")}
                </button>
                <button
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  disabled={Boolean(savingByJobId[job.id])}
                  onClick={() => void saveOrApply(job, "applied")}
                >
                  {t("applyNow")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
