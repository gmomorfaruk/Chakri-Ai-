"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function DashboardError({ reset }: { reset: () => void }) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
      <h1 className="text-lg font-semibold">{t("dashboardErrorTitle")}</h1>
      <p className="mt-2 text-sm text-red-200/90">{t("dashboardErrorDescription")}</p>
      <button onClick={reset} className="mt-4 rounded-lg border border-red-300/50 px-3 py-2 text-sm">
        {t("retry")}
      </button>
    </section>
  );
}
