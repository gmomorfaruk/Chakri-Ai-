"use client";
import { useI18n } from "@/components/providers/I18nProvider";

type SupportedLang = "en" | "bn";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as SupportedLang)}
      className={`rounded border bg-muted px-2 py-1 text-foreground ${className}`.trim()}
      aria-label={t("language")}
      title={t("language")}
    >
      <option value="en">{t("english")}</option>
      <option value="bn">{t("bangla")}</option>
    </select>
  );
}
