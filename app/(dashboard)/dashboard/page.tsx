"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function DashboardHome() {
  const { t } = useI18n();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("home")}</h1>
      <p className="text-muted-foreground">
        Welcome to Chakri AI dashboard. Your profile, jobs, and AI coaching modules are organized here.
      </p>
    </section>
  );
}
