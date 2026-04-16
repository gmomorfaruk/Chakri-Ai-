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
      <style jsx global>{`
        .${CHAKRI_TOKEN_CLASS} {
          --bg: #080c14;
          --bg2: #0e1420;
          --bg3: #131926;
          --bg4: #1a2133;
          --bg5: #1f2940;
          --border: #1e2a3d;
          --border2: #263347;
          --border3: #2e3d57;
          --text: #e8eef8;
          --text2: #8a9ab5;
          --text3: #4d6080;
          --blue: #4f8ef7;
          --blue2: #3a7af0;
          --blue-dim: #0d1e3d;
          --blue-bright: #7aaeff;
          --cyan: #38bdf8;
          --green: #34d399;
          --green-dim: #0a2019;
          --amber: #fbbf24;
          --amber-dim: #1f1500;
          --red: #f87171;
          --red-dim: #1f0a0a;
          --purple: #a78bfa;
          --purple-dim: #18102f;
        }

        .chakri-shell {
          color: var(--text);
          background: var(--bg);
          font-family: "Inter", system-ui, -apple-system, sans-serif;
        }

        .chakri-shell * {
          scrollbar-width: thin;
          scrollbar-color: var(--border2) transparent;
        }

        .chakri-shell *::-webkit-scrollbar {
          width: 4px;
        }

        .chakri-shell *::-webkit-scrollbar-track {
          background: transparent;
        }

        .chakri-shell *::-webkit-scrollbar-thumb {
          background: var(--border2);
          border-radius: 10px;
        }

        .chakri-shell .mono {
          font-family: "JetBrains Mono", "JetBrainsMono", monospace;
        }

        .chakri-shell .heading {
          font-family: "Syne", "Inter", sans-serif;
          letter-spacing: -0.5px;
        }

        .chakri-shell .card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .chakri-shell .pill {
          border-radius: 20px;
        }

        .chakri-shell .btn {
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .chakri-shell .btn:hover {
          transform: translateY(-1px);
        }

        .chakri-shell .session-dot {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
      {children}
    </NextThemesProvider>
  );
}
