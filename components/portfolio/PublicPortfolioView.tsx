"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { PublicPortfolio } from "@/lib/portfolioService";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export function PublicPortfolioView({ data }: { data: PublicPortfolio }) {
  const { t } = useI18n();
  const theme = data.profile.theme ?? "minimal";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className={`rounded-3xl border border-border p-8 ${theme === "modern" ? "bg-gradient-to-br from-primary/20 to-cyan-500/10" : "bg-card"}`}>
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Chakri AI Portfolio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.profile.full_name ?? t("profile")}</h1>
        <p className="mt-2 text-muted-foreground">@{data.profile.username}</p>
        {data.profile.bio ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{data.profile.bio}</p> : null}
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section title={t("skills")}>
          {data.skills.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptySkills")}</p> : data.skills.map((item) => (
            <p key={item.id} className="text-sm">{item.name} <span className="text-muted-foreground">({item.level ?? t("notSet")})</span></p>
          ))}
        </Section>

        <Section title={t("education")}>
          {data.educations.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyEducation")}</p> : data.educations.map((item) => (
            <div key={item.id}>
              <p className="font-medium">{item.institution}</p>
              <p className="text-sm text-muted-foreground">{item.degree ?? "-"} · {item.field_of_study ?? "-"}</p>
            </div>
          ))}
        </Section>

        <Section title={t("experience")}>
          {data.experiences.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyExperience")}</p> : data.experiences.map((item) => (
            <div key={item.id}>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.company}</p>
              {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
            </div>
          ))}
        </Section>

        <Section title={t("projects")}>
          {data.projects.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyProjects")}</p> : data.projects.map((item) => (
            <div key={item.id}>
              <p className="font-medium">{item.title}</p>
              {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{item.url}</a> : null}
            </div>
          ))}
        </Section>
      </div>
    </main>
  );
}
