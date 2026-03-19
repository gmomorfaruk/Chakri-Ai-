"use client";

import { useEffect, useMemo, useState } from "react";
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

  function runMatching() {
    onError(null);
    if (!jobDescription.trim()) {
      onError(t("jobMatchingValidation"));
      return;
    }

    const analysis = analyzeCareerDnaMatch(jobDescription, profileSkills);
    setResult(analysis);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("jobMatching")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("jobMatchingHint")}</p>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
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
            className="rounded-lg border border-border px-3 py-2"
            onClick={useSelectedJobDescription}
            disabled={!selectedJob}
          >
            {t("useSelectedJob")}
          </button>
          <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={runMatching}>
            {t("analyzeJobMatch")}
          </button>
        </div>

        <textarea
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2"
          rows={8}
          placeholder={t("pasteJobDescription")}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">{t("profileSkillsSnapshot")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {profileSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptySkills")}</p>
          ) : (
            profileSkills.map((skill) => (
              <span key={skill} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {skill}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">{t("matchingResult")}</h3>
        {!result ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noMatchingResult")}</p>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{t("matchingScore")}</span>
                <span>{result.score}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${result.score}%` }} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium">{t("matchedSkills")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.matchedSkills.length === 0 ? <li>{t("none")}</li> : result.matchedSkills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium">{t("missingSkills")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.missingSkills.length === 0 ? <li>{t("none")}</li> : result.missingSkills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">{t("improvementSuggestions")}</p>
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
