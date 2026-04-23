"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { PremiumChatInterface } from "@/components/coach/PremiumChatInterface";
import { QuizPractice } from "@/components/coach/QuizPractice";
import { ConversationalLearningAI } from "@/components/learning/ConversationalLearningAI";
import { Sparkles, Target } from "lucide-react";
import { useSearchParams } from "next/navigation";

function getInitialView(view: string | null): "chat" | "quiz" | "learning" {
  if (view === "chat" || view === "quiz" || view === "learning") {
    return view;
  }

  return "learning";
}

export function AICoachModule() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const view = getInitialView(searchParams.get("view"));

  const nextStepText =
    view === "chat"
      ? t("coachNextStepInterview")
      : view === "learning"
        ? t("coachNextStepLearning")
        : t("coachNextStepQuiz");

  const motivationText =
    view === "chat"
      ? "Every strong answer improves your confidence. Keep practicing with intent."
      : view === "learning"
        ? "Small daily learning steps compound into major career growth."
        : "Practice smarter today so your real interview feels easier tomorrow.";

  const focusLabel =
    view === "chat" ? "Interview Focus" : view === "learning" ? "Learning Focus" : "Quiz Focus";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0a0f1e]">
      <div className="border-b border-slate-800/60 px-4 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(14,32,59,0.85),rgba(15,26,48,0.65))] p-3 shadow-[0_10px_30px_rgba(8,28,60,0.35)] sm:p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
              {view === "learning" ? <Target size={16} /> : <Sparkles size={16} />}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{focusLabel}</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-100 sm:text-base">{nextStepText}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{motivationText}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {view === "chat" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <PremiumChatInterface />
          </div>
        )}
        {view === "learning" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <ConversationalLearningAI />
          </div>
        )}
        {view === "quiz" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <QuizPractice />
          </div>
        )}
      </div>
    </div>
  );
}
