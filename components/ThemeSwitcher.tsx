"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

type ThemeSwitcherProps = {
  className?: string;
};

export function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  const activeTheme = mounted ? resolvedTheme ?? theme ?? "dark" : "dark";
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  const switchTitle = mounted ? `${t("theme")}: ${nextTheme === "dark" ? t("dark") : t("light")}` : t("theme");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className={`flex items-center rounded border bg-muted p-2 text-foreground ${className}`.trim()}
      aria-label={switchTitle}
      title={switchTitle}
    >
      {!mounted ? <Moon size={18} /> : activeTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
