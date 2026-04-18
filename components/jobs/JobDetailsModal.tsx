"use client";

import { X, ArrowUpRight, Bookmark, BookmarkCheck, Building2, CalendarClock, MapPin, Radar, Wallet } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { UnifiedJobRecord } from "@/types/jobs";

type JobDetailsModalProps = {
  job: UnifiedJobRecord | null;
  saved: boolean;
  onClose: () => void;
  onApplyNow: (job: UnifiedJobRecord) => void;
  onToggleSave: (job: UnifiedJobRecord) => void;
  onAddToTracker: (job: UnifiedJobRecord) => void;
  onMatchMe: (job: UnifiedJobRecord) => void;
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

export function JobDetailsModal({
  job,
  saved,
  onClose,
  onApplyNow,
  onToggleSave,
  onAddToTracker,
  onMatchMe,
}: JobDetailsModalProps) {
  const { t } = useI18n();
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-background/90 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-border/70 bg-background/70 p-2 text-muted-foreground transition hover:text-foreground"
          aria-label={t("close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-10">
          <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
            {job.title}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {job.company}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location || t("remoteFlexible")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Radar className="h-4 w-4" />
              {job.experience_level}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" />
              {t("deadlineLabel")}: {formatDate(job.deadline) || t("notAvailable")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              {t("salaryLabel")}: {job.salary || t("notSpecified")}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-primary/35 bg-primary/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
            {job.source_type}
          </span>
          <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            {job.job_type}
          </span>
          <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            {t("categoryLabel")}: {job.category}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("overview")}</h4>
            <p className="mt-2 text-sm leading-6 text-foreground/90">{job.full_description || job.short_description}</p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("requirements")}</h4>
            {job.requirements.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noStructuredRequirements")}</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                {job.requirements.map((item) => (
                  <li key={`${job.id}-req-${item}`}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("responsibilities")}</h4>
            {job.responsibilities.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noStructuredResponsibilities")}</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
                {job.responsibilities.map((item) => (
                  <li key={`${job.id}-resp-${item}`}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("requiredSkills")}</h4>
            {job.skills.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noExtractedSkills")}</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span key={`${job.id}-skill-${skill}`} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>{t("sourceLabel")}: {job.source}</p>
          <p className="mt-1">{t("postedLabel")}: {formatDate(job.posted_at) || t("notAvailable")} | {t("updatedLabel")}: {formatDate(job.updated_at) || t("notAvailable")}</p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onApplyNow(job)}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Apply Now <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/70 bg-background/70 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35"
          >
            {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
            {saved ? t("saved") : t("saveJob")}
          </button>
          <button
            type="button"
            onClick={() => onAddToTracker(job)}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
          >
            {t("jobMatchesAddToTracker")}
          </button>
          <button
            type="button"
            onClick={() => onMatchMe(job)}
            className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/15"
          >
            {t("matchMe")}
          </button>
        </div>
      </div>
    </div>
  );
}
