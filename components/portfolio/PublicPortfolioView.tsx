"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  GraduationCap,
  Link2,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { PublicPortfolio } from "@/lib/portfolioService";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {icon}
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function toSafeHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function initialsFromName(fullName: string, username: string) {
  const source = (fullName || username || "P").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function dateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Timeline not specified";
  return `${startDate ?? "Start"} - ${endDate ?? "Present"}`;
}

function splitSentences(text: string) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function interviewerSnapshot(description: string | null, url: string | null) {
  const parts = description ? splitSentences(description) : [];
  return {
    problem: parts[0] ?? "Business challenge not explicitly stated.",
    build: parts[1] ?? "Implemented a practical solution using modern engineering patterns.",
    proof: url ? "Public artifact available for evaluation." : "Private build; details available on request.",
  };
}

function normalizeSkillName(name: string) {
  return name.trim().toLowerCase();
}

function classifySkill(name: string) {
  const value = normalizeSkillName(name);

  const coreKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "c++",
    "react",
    "next",
    "node",
    "sql",
    "go",
    "api",
    "algorithm",
    "system design",
  ];
  const toolsKeywords = [
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "git",
    "figma",
    "tableau",
    "power bi",
    "linux",
    "jira",
    "supabase",
    "postgres",
  ];

  if (coreKeywords.some((keyword) => value.includes(keyword))) return "Core";
  if (toolsKeywords.some((keyword) => value.includes(keyword))) return "Tools";
  return "Professional";
}

function groupedSkills(skills: PublicPortfolio["skills"]) {
  const groups = {
    Core: [] as PublicPortfolio["skills"],
    Tools: [] as PublicPortfolio["skills"],
    Professional: [] as PublicPortfolio["skills"],
  };

  skills.forEach((skill) => {
    groups[classifySkill(skill.name)].push(skill);
  });

  return groups;
}

function certificateRankScore(document: PublicPortfolio["documents"][number]) {
  const base = `${document.name} ${document.type ?? ""}`.toLowerCase();
  let score = 0;

  if (base.includes("aws") || base.includes("azure") || base.includes("gcp")) score += 40;
  if (base.includes("google") || base.includes("microsoft") || base.includes("meta")) score += 30;
  if (base.includes("professional") || base.includes("expert") || base.includes("associate")) score += 25;
  if (base.includes("security") || base.includes("data") || base.includes("cloud")) score += 15;

  return score;
}

export function PublicPortfolioView({ data }: { data: PublicPortfolio }) {
  const { t } = useI18n();
  const theme = data.profile.theme ?? "minimal";
  const [avatarFailed, setAvatarFailed] = useState(false);

  const displayName = data.profile.full_name ?? t("profile");
  const username = data.profile.username ?? "user";
  const headline =
    data.experiences[0]?.title
      ? `${data.experiences[0].title} at ${data.experiences[0].company}`
      : "Career-ready professional portfolio";

  const hasAvatar = Boolean(data.profile.avatar_url) && !avatarFailed;
  const initials = initialsFromName(displayName, username);
  const skillsByGroup = groupedSkills(data.skills);
  const rankedCertificates = [...data.documents].sort((a, b) => certificateRankScore(b) - certificateRankScore(a));
  const spotlightCertificates = rankedCertificates.slice(0, 3);
  const supportingCertificates = rankedCertificates.slice(3);

  const shellTone =
    theme === "modern"
      ? "from-primary/10 via-cyan-500/10 to-background"
      : theme === "classic"
        ? "from-amber-500/10 via-background to-background"
        : "from-background via-background to-background";

  return (
    <main className={`mx-auto max-w-6xl bg-gradient-to-b px-4 py-10 ${shellTone}`}>
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_45%)]" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted md:h-28 md:w-28">
              {hasAvatar ? (
                <img
                  src={data.profile.avatar_url as string}
                  alt={`${displayName} profile`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-cyan-500/20 text-2xl font-bold text-primary">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full border border-background bg-emerald-400" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Chakri AI Portfolio</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{displayName}</h1>
              <p className="mt-1 text-sm font-medium text-primary">@{username}</p>
              <p className="mt-2 text-sm text-muted-foreground">{headline}</p>
              {data.profile.bio ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{data.profile.bio}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-[260px]">
            {[
              { label: t("projects"), value: data.projects.length },
              { label: t("skills"), value: data.skills.length },
              { label: t("documents"), value: data.documents.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                <p className="text-lg font-semibold tracking-tight">{item.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <Section title={t("projects")} icon={<Sparkles size={16} className="text-primary" />}>
            {data.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyProjects")}</p>
            ) : (
              <div className="grid gap-3">
                {data.projects.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-border bg-background/60 p-4 transition hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Featured Project {index + 1}</p>
                        <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                      </div>
                      {item.url ? (
                        <a
                          href={toSafeHref(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                    {item.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">{dateRange(item.start_date, item.end_date)}</p>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {(() => {
                        const snapshot = interviewerSnapshot(item.description, item.url);
                        return [
                          { label: "Problem", value: snapshot.problem },
                          { label: "Build", value: snapshot.build },
                          { label: "Proof", value: snapshot.proof },
                        ].map((piece) => (
                          <div key={piece.label} className="rounded-lg border border-border bg-card/70 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{piece.label}</p>
                            <p className="mt-1 text-xs leading-5 text-foreground/90">{piece.value}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Section>

          <Section title={t("experience")} icon={<BriefcaseBusiness size={16} className="text-primary" />}>
            {data.experiences.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyExperience")}</p>
            ) : (
              <div className="space-y-3">
                {data.experiences.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{dateRange(item.start_date, item.end_date)}</p>
                    </div>
                    <p className="text-sm text-primary">{item.company}</p>
                    {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </Section>

          <Section title={t("education")} icon={<GraduationCap size={16} className="text-primary" />}>
            {data.educations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyEducation")}</p>
            ) : (
              data.educations.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="font-semibold">{item.institution}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.degree ?? "Degree not specified"} · {item.field_of_study ?? "Field not specified"}
                  </p>
                </article>
              ))
            )}
          </Section>
        </div>

        <div className="space-y-5 lg:col-span-4">
          <Section title={t("skills")} icon={<Link2 size={16} className="text-primary" />}>
            {data.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptySkills")}</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Core Engineering", items: skillsByGroup.Core },
                  { label: "Tools & Platforms", items: skillsByGroup.Tools },
                  { label: "Professional Edge", items: skillsByGroup.Professional },
                ].map((group) => (
                  <div key={group.label} className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p>
                    {group.items.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">No entries in this section.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <div key={item.id} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm">
                            <span className="font-medium">{item.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{item.level ?? t("notSet")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={t("documents")} icon={<BadgeCheck size={16} className="text-primary" />}>
            {data.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyDocuments")}</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2.5">
                  {spotlightCertificates.map((item, index) => (
                    <article key={item.id} className="rounded-xl border border-primary/35 bg-primary/10 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-primary">Spotlight #{index + 1}</p>
                        <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-semibold text-primary">Top</span>
                      </div>
                      <p className="mt-1 font-medium">{item.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.type ?? "Certificate"}</p>
                      <a
                        href={toSafeHref(item.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Verify <ExternalLink size={12} />
                      </a>
                    </article>
                  ))}
                </div>

                {supportingCertificates.length > 0 ? (
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Supporting Certifications</p>
                    <div className="mt-2 space-y-1.5">
                      {supportingCertificates.map((item) => (
                        <a
                          key={item.id}
                          href={toSafeHref(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition hover:border-primary/40"
                        >
                          <span className="truncate pr-2">{item.name}</span>
                          <ExternalLink size={12} className="shrink-0 text-primary" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </Section>
        </div>
      </div>

      <p className="mt-8 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Built with Chakri AI · Professional Portfolio
      </p>
    </main>
  );
}
