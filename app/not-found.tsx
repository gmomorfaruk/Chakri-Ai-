"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("notFoundPortfolioTitle")}</h1>
      <p className="mt-3 text-muted-foreground">
        {t("notFoundPortfolioDescription")}
      </p>
    </main>
  );
}
