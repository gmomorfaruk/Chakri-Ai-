"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge, Loader2, Sparkles, Zap } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { analyzeCareerDnaMatch, CareerDnaResult } from "@/lib/jobMatching";
import { Job } from "@/types/jobs";

type JobMatchingPanelProps = {
  userId: string;
  approvedPosts: Job[];
  onError: (message: string | null) => void;
};

export function JobMatchingPanel({ userId, approvedPosts, onError }: JobMatchingPanelProps) {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [profileSkills, setProfileSkills] = useState<string[]>([]);
  const [result, setResult] = useState<CareerDnaResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkills() {
      if (!supabase) {
        onError(t("profileSupabaseMissing"));
        return;
      }

      const { data, error } = await supabase.from("skills").select("name").eq("user_id", userId);
      if (error) {
        onError(error.message);
        return;
      }

      setProfileSkills((data ?? []).map((row) => row.name as string).filter(Boolean));
    }

    void loadSkills();
  }, [supabase, userId, onError, t]);

  const selectedJob = useMemo(
    () => approvedPosts.find((item) => item.id === selectedJobId) ?? null,
    [approvedPosts, selectedJobId]
  );

  function useSelectedJobDescription() {
    if (!selectedJob) return;
    setJobDescription(selectedJob.description);
  }

  async function runMatching() {
    onError(null);
    if (!jobDescription.trim()) {
      onError(t("jobMatchingValidation"));
      return;
    }

    setIsAnalyzing(true);
    try {
      // Small async boundary keeps the UI responsive and avoids "dead click" feel.
      await new Promise((resolve) => setTimeout(resolve, 280));
      const analysis = analyzeCareerDnaMatch(jobDescription, profileSkills);
      setResult(analysis);
      setLastAnalyzedAt(new Date().toLocaleTimeString());
    } catch {
      onError("Unable to analyze this description right now. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const canAnalyze = jobDescription.trim().length >= 20;
  const matchedPct = result?.score ?? 0;
  const scoreTone = matchedPct >= 75 ? "text-emerald-300" : matchedPct >= 50 ? "text-amber-300" : "text-red-300";
  const scoreLabel = matchedPct >= 75 ? "Strong fit" : matchedPct >= 50 ? "Moderate fit" : "Low fit";
  const quickDescriptionPills = [
    "Frontend role (React + TypeScript)",
    "Backend role (Node + SQL)",
    "Data Analyst role (Python + SQL)",
  ];

  function insertQuickDescription(value: string) {
    const presets: Record<string, string> = {
      "Frontend role (React + TypeScript)":
        "We are hiring a Frontend Engineer with strong React, TypeScript, Tailwind CSS, API integration, and testing experience. Candidate should collaborate with design and product teams, build reusable UI components, and optimize performance.",
      "Backend role (Node + SQL)":
        "Looking for a Backend Engineer proficient in Node.js, API design, PostgreSQL, authentication, and cloud deployment. You will build scalable services, secure endpoints, and maintain system reliability in production.",
      "Data Analyst role (Python + SQL)":
        "Seeking a Data Analyst skilled in SQL, Python, Excel, and dashboarding tools. Responsibilities include data cleaning, reporting, business insights, and communicating findings to stakeholders.",
    };

    const template = presets[value];
    if (template) {
      setJobDescription(template);
      setResult(null);
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-4 shadow-sm sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.13),transparent_48%)]" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Career DNA Scanner</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("jobMatchingHint")}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Match v2
          </div>
        </div>

        <div className="relative mt-4 grid gap-2 md:mt-5 md:grid-cols-3">
          <select
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="">{t("selectApprovedJob")}</option>
            {approvedPosts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title} · {post.company}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition hover:border-primary/30 hover:text-foreground md:whitespace-nowrap"
            onClick={useSelectedJobDescription}
            disabled={!selectedJob}
          >
            {t("useSelectedJob")}
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void runMatching()}
            disabled={!canAnalyze || isAnalyzing}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isAnalyzing ? "Analyzing..." : t("analyzeJobMatch")}
          </button>
        </div>

        <textarea
          className="relative mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6"
          rows={8}
          placeholder={t("pasteJobDescription")}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {jobDescription.trim().length} chars · minimum 20 chars needed for analysis
          </p>
          <div className="flex flex-wrap gap-2">
            {quickDescriptionPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => insertQuickDescription(pill)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{t("profileSkillsSnapshot")}</h3>
          <span className="text-xs text-muted-foreground">{profileSkills.length} skills</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {profileSkills.length === 0 ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("emptySkills")}
            </div>
          ) : (
            profileSkills.map((skill) => (
              <span key={skill} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                {skill}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold tracking-tight">{t("matchingResult")}</h3>
          {lastAnalyzedAt ? <span className="text-xs text-muted-foreground">Last analyzed at {lastAnalyzedAt}</span> : null}
        </div>
        {!result ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{t("noMatchingResult")}</div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 md:col-span-2">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{t("matchingScore")}</span>
                  <span className={`font-semibold ${scoreTone}`}>{result.score}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${result.score}%` }} />
                </div>
                <p className={`mt-2 text-xs font-medium ${scoreTone}`}>{scoreLabel}</p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Gauge className="h-4 w-4 text-primary" />
                  Coverage
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{result.matchedSkills.length}/{result.requiredSkills.length}</p>
                <p className="text-xs text-muted-foreground">skills matched from detected requirements</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="font-semibold">Detected required skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.requiredSkills.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No required skills detected.</span>
                ) : (
                  result.requiredSkills.map((skill) => (
                    <span key={skill} className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground/90">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <p className="inline-flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {t("matchedSkills")}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.matchedSkills.length === 0 ? <li>{t("none")}</li> : result.matchedSkills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                <p className="inline-flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  {t("missingSkills")}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.missingSkills.length === 0 ? <li>{t("none")}</li> : result.missingSkills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="font-semibold">{t("improvementSuggestions")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.suggestions.length === 0 ? <li>{t("noSuggestions")}</li> : result.suggestions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
