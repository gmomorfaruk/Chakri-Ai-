"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const CHAKRI_TOKEN_CLASS = "chakri-tokens";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    document.body.classList.add(CHAKRI_TOKEN_CLASS);
    return () => document.body.classList.remove(CHAKRI_TOKEN_CLASS);
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["dark", "light"]}>
      {children}
    </NextThemesProvider>
  );
}
