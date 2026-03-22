"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export function QuizPractice() {
  const { t } = useI18n();

  return (
    <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] p-8 min-h-fit">
      <div className="max-w-md space-y-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20" />
          <div className="relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-full w-24 h-24 flex items-center justify-center mx-auto border border-purple-400/30">
            <span className="text-4xl">📝</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{t("quizPractice") || "Quiz Practice"}</h2>
          <p className="text-slate-400">
            Test your knowledge with curated questions for your target role and prepare smarter.
          </p>
        </div>

        <div className="pt-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📚</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Multiple Quiz Types</p>
                <p className="text-xs text-slate-400">MCQ, Technical, Behavioral</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">⏱️</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Timed Challenges</p>
                <p className="text-xs text-slate-400">Practice under pressure</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📊</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Performance Analytics</p>
                <p className="text-xs text-slate-400">Track your progress</p>
              </div>
            </div>
          </div>
        </div>

        <button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30">
          Coming Soon
        </button>
      </div>
    </div>
  );
}
