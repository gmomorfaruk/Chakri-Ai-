"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded p-2 bg-muted text-foreground border flex items-center"
      aria-label="Toggle theme"
    >
      {!mounted ? <Moon size={18} /> : theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
