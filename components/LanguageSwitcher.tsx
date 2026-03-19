"use client";
import { useI18n } from "@/components/providers/I18nProvider";

type SupportedLang = "en" | "bn";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as SupportedLang)}
      className="rounded px-2 py-1 bg-muted text-foreground border"
      aria-label={t("language")}
    >
      <option value="en">English</option>
      <option value="bn">বাংলা</option>
    </select>
  );
}
