"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();

  return (
    <html>
      <body className="min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t("globalErrorTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("globalErrorDescription")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{error.digest ? `${t("refLabel")}: ${error.digest}` : null}</p>
          <button onClick={reset} className="mt-5 rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            {t("tryAgain")}
          </button>
        </main>
      </body>
    </html>
  );
}
