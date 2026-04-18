"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { CoachMode, CoachSession } from "@/types/coach";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

interface SessionsSidebarProps {
  sessions: CoachSession[];
  activeSessionId: string | null;
  mode: CoachMode;
  onLoadSession: (sessionId: string) => Promise<void>;
  onCreateSession: () => Promise<string | null>;
  onModeChange: (mode: CoachMode) => void;
}

export function SessionsSidebar({
  sessions,
  activeSessionId,
  mode,
  onLoadSession,
  onCreateSession,
  onModeChange,
}: SessionsSidebarProps) {
  const { t } = useI18n();
  const [isModesOpen, setIsModesOpen] = useState(true);
  const [isSessionsOpen, setIsSessionsOpen] = useState(true);

  const modes: Array<{ id: CoachMode; label: string; icon: string }> = [
    { id: "hr", label: t("hrMode") || "HR Interview", icon: "👔" },
    { id: "technical", label: t("technicalMode") || "Technical", icon: "🧠" },
    { id: "behavioral", label: t("behavioralMode") || "Behavioral", icon: "💬" },
  ];

  const handleNewSession = async () => {
    await onCreateSession();
  };

  return (
    <aside className="hidden h-full min-h-0 w-64 flex-shrink-0 flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] shadow-2xl md:flex">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-6">
        <h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent">
          {t("aiCareerCoach") || "AI Career Coach"}
        </h1>
      </div>

      {/* New Chat Button */}
      <button
        onClick={handleNewSession}
        className="mx-3 my-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30"
      >
        <Plus className="h-4 w-4" />
        {t("newSession") || "New Chat"}
      </button>

      {/* Divider */}
      <div className="mx-3 my-2 h-px bg-white/5" />

      {/* Modes Section */}
      <div className="space-y-2 px-3 py-3">
        <button
          onClick={() => setIsModesOpen(!isModesOpen)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase text-gray-400 transition-colors hover:text-gray-200"
        >
          <span>{t("coachMode") || "Coach Mode"}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isModesOpen ? "rotate-180" : ""}`} />
        </button>

        {isModesOpen && (
          <div className="space-y-1.5">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-left transition-all ${
                  mode === m.id
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-200"
                    : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className="mr-2">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 h-px bg-white/5" />

      {/* Sessions Section */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
        <button
          onClick={() => setIsSessionsOpen(!isSessionsOpen)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase text-gray-400 transition-colors hover:text-gray-200 mb-2"
        >
          <span>{t("sessionHistory") || "History"}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isSessionsOpen ? "rotate-180" : ""}`} />
        </button>

        {isSessionsOpen && (
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">{t("emptySessions") || "No sessions yet"}</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => void onLoadSession(session.id)}
                  className={`group w-full rounded-lg px-3 py-2 text-left text-xs transition-all font-medium truncate ${
                    activeSessionId === session.id
                      ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-500/50 text-blue-100"
                      : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200"
                  }`}
                  title={session.title ?? "Untitled"}
                >
                  {session.title ?? "Untitled"}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3 text-xs text-gray-500">
        <p>{mode === "technical" ? "🧠 Technical" : mode === "behavioral" ? "💬 Behavioral" : "👔 HR"}</p>
      </div>
    </aside>
  );
}
