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
          --bg: #edf4ff;
          --bg2: #f7fbff;
          --bg3: #ffffff;
          --bg4: #e4eefb;
          --bg5: #dbe8f8;
          --border: #cfdbec;
          --border2: #b8cae2;
          --border3: #9fb6d5;
          --text: #0f172a;
          --text2: #4f637d;
          --text3: #71839b;
          --blue: #0284c7;
          --blue2: #2563eb;
          --blue-dim: #d8ebff;
          --blue-bright: #0ea5e9;
          --cyan: #06b6d4;
          --green: #10b981;
          --green-dim: #dcfce7;
          --amber: #f59e0b;
          --amber-dim: #fef3c7;
          --red: #ef4444;
          --red-dim: #fee2e2;
          --purple: #7c3aed;
          --purple-dim: #ede9fe;
        }

        .dark .${CHAKRI_TOKEN_CLASS} {
          --bg: #070b13;
          --bg2: #0d1424;
          --bg3: #121a2d;
          --bg4: #19243a;
          --bg5: #1f2a43;
          --border: #24324a;
          --border2: #2e3d57;
          --border3: #374967;
          --text: #ebf1fb;
          --text2: #9aabc5;
          --text3: #6f819b;
          --blue: #38bdf8;
          --blue2: #3b82f6;
          --blue-dim: #0d1d34;
          --blue-bright: #7dd3fc;
          --cyan: #22d3ee;
          --green: #34d399;
          --green-dim: #0b2119;
          --amber: #fbbf24;
          --amber-dim: #211602;
          --red: #f87171;
          --red-dim: #220d0d;
          --purple: #a78bfa;
          --purple-dim: #191133;
        }

        .chakri-shell {
          color: var(--text);
          background: linear-gradient(180deg, var(--bg), var(--bg2) 70%);
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
          background: linear-gradient(145deg, color-mix(in srgb, var(--bg3) 90%, transparent), color-mix(in srgb, var(--bg2) 92%, transparent));
          border: 1px solid color-mix(in srgb, var(--border2) 60%, transparent);
          border-radius: 12px;
          box-shadow: 0 14px 34px color-mix(in srgb, var(--bg) 45%, transparent);
          backdrop-filter: blur(10px);
        }

        .chakri-shell .pill {
          border-radius: 20px;
        }

        .chakri-shell .btn {
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .chakri-shell .btn:hover {
          transform: translateY(-1px) scale(1.02);
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
