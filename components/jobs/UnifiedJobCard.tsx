"use client";

import { ArrowUpRight, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, CheckCircle2, Clock3, ExternalLink, MapPin, Radar } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { UnifiedJobRecord } from "@/types/jobs";

type UnifiedJobCardProps = {
  job: UnifiedJobRecord;
  saved: boolean;
  onViewDetails: (job: UnifiedJobRecord) => void;
  onApplyNow: (job: UnifiedJobRecord) => void;
  onToggleSave: (job: UnifiedJobRecord) => void;
  onAddToTracker: (job: UnifiedJobRecord) => void;
  onMatchMe: (job: UnifiedJobRecord) => void;
};

function sourceTone(sourceType: UnifiedJobRecord["source_type"]) {
  if (sourceType === "internal") return "border-cyan-500/35 bg-cyan-500/12 text-cyan-300";
  if (sourceType === "manual") return "border-violet-500/35 bg-violet-500/12 text-violet-300";
  if (sourceType === "feed") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
  if (sourceType === "scraper") return "border-amber-500/35 bg-amber-500/12 text-amber-300";
  return "border-primary/35 bg-primary/12 text-primary";
}

function statusTone(status: UnifiedJobRecord["status"]) {
  if (status === "approved" || status === "active") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
  if (status === "pending") return "border-amber-500/35 bg-amber-500/12 text-amber-300";
  if (status === "expired" || status === "inactive") return "border-red-500/35 bg-red-500/12 text-red-300";
  return "border-border/60 bg-background/70 text-muted-foreground";
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

export function UnifiedJobCard({
  job,
  saved,
  onViewDetails,
  onApplyNow,
  onToggleSave,
  onAddToTracker,
  onMatchMe,
}: UnifiedJobCardProps) {
  const { t } = useI18n();
  const initials = (job.company || job.title).slice(0, 2).toUpperCase();

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-border/65 bg-gradient-to-br from-card via-card/95 to-background/90 p-5 shadow-[0_14px_42px_rgba(2,6,23,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_24px_65px_rgba(139,92,246,0.16)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
              {job.title}
            </h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${sourceTone(job.source_type)}`}>
              {job.source_type}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusTone(job.status)}`}>
              {job.status}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {job.company}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location || t("remoteFlexible")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {job.job_type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1">
              <Radar className="h-3.5 w-3.5" />
              {job.experience_level}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{job.short_description || job.full_description}</p>

      {job.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.skills.slice(0, 6).map((skill) => (
            <span key={`${job.id}-${skill}`} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-xl border border-border/60 bg-background/60 p-2">
          <p className="uppercase tracking-[0.14em] text-[10px]">{t("postedLabel")}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDate(job.posted_at)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-2">
          <p className="uppercase tracking-[0.14em] text-[10px]">{t("deadlineLabel")}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {formatDate(job.deadline)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(job)}
          className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40"
        >
          {t("openDetails")}
        </button>
        <button
          type="button"
          onClick={() => onApplyNow(job)}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          Apply Now <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onToggleSave(job)}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40"
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />} {saved ? t("saved") : t("saveForLater")}
        </button>
        <button
          type="button"
          onClick={() => onAddToTracker(job)}
          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
        >
          {t("trackApplication")}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => onMatchMe(job)}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/15"
        >
          {t("checkMatch")} <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
