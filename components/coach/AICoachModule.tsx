"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { AIVoiceConversation } from "@/components/coach/AIVoiceConversation";
import { PremiumChatInterface } from "@/components/coach/PremiumChatInterface";
import { QuizPractice } from "@/components/coach/QuizPractice";
import { ConversationalLearningAI } from "@/components/learning/ConversationalLearningAI";

export function AICoachModule() {
  const { t } = useI18n();

  const [view, setView] = useState<"chat" | "voice" | "quiz" | "learning">("chat");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0a0f1e]">
      {/* View Toggle - Fixed at top */}
      <div className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-slate-700/50 bg-gradient-to-b from-[#0a0f1e]/95 to-[#0a0f1e]/80 p-4 backdrop-blur-md">
        <button
          onClick={() => setView("chat")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            view === "chat"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-white/10 text-gray-400 hover:bg-white/20"
          }`}
        >
          💬 {t("interviewCoach") || "Chat"}
        </button>
        <button
          onClick={() => setView("learning")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            view === "learning"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-white/10 text-gray-400 hover:bg-white/20"
          }`}
        >
          🎓 {t("learningCoach") || "Learning AI"}
        </button>
        <button
          onClick={() => setView("voice")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            view === "voice"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-white/10 text-gray-400 hover:bg-white/20"
          }`}
        >
          🎤 {t("voiceVivaPractice") || "Voice"}
        </button>
        <button
          onClick={() => setView("quiz")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            view === "quiz"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
              : "bg-white/10 text-gray-400 hover:bg-white/20"
          }`}
        >
          📝 {t("quizPractice") || "Quiz"}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "chat" && <PremiumChatInterface />}
        {view === "learning" && <ConversationalLearningAI />}
        {view === "voice" && <AIVoiceConversation mode="hr" />}
        {view === "quiz" && <QuizPractice />}
      </div>
    </div>
  );
}
