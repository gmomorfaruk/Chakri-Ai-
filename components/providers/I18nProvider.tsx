"use client";
import * as React from "react";
import { messages, SupportedLang } from "@/lib/i18n";

const I18nContext = React.createContext<{
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
}>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<SupportedLang>("en");

  React.useEffect(() => {
    const savedLang = window.localStorage.getItem("chakri-lang");
    if (savedLang === "en" || savedLang === "bn") {
      setLang(savedLang);
    }
  }, []);

  const handleSetLang = React.useCallback((nextLang: SupportedLang) => {
    setLang(nextLang);
    window.localStorage.setItem("chakri-lang", nextLang);
  }, []);

  const t = React.useCallback((key: string) => (messages[lang] as Record<string, string>)[key] || key, [lang]);
  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return React.useContext(I18nContext);
}
