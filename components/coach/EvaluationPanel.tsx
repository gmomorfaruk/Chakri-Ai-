"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { CoachEvaluation } from "@/types/coach";
import { motion } from "framer-motion";
import { CircularProgress } from "./CircularProgress";

interface EvaluationPanelProps {
  evaluation: CoachEvaluation | null;
}

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  const { t } = useI18n();

  return (
    <div className="hidden h-full min-h-0 w-72 flex-shrink-0 flex-col overflow-hidden border-l border-white/5 bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] shadow-2xl lg:flex">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-6">
        <h2 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
          {t("answerEvaluation") || "Performance"}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {!evaluation ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center space-y-3 py-8 text-center"
          >
            <div className="text-3xl opacity-40">📊</div>
            <p className="text-sm text-gray-400">
              {t("emptyEvaluation") || "Your evaluation will appear here after you answer"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
            className="space-y-6"
          >
            {/* Circular Progress Metrics */}
            <div className="grid gap-6 auto-rows-max justify-items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0 }}
              >
                <CircularProgress
                  value={evaluation.answer_clarity_score}
                  label={t("clarity") || "Clarity"}
                  color="blue"
                  size="sm"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <CircularProgress
                  value={evaluation.confidence_score}
                  label={t("confidence") || "Confidence"}
                  color="purple"
                  size="sm"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <CircularProgress
                  value={evaluation.relevance_score}
                  label={t("relevance") || "Relevance"}
                  color="cyan"
                  size="sm"
                />
              </motion.div>
            </div>

            {/* Feedback Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {t("feedback") || "Feedback"}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                {evaluation.feedback || "Keep practicing to improve your performance."}
              </p>

              {/* Glowing accent */}
              <div className="mt-3 h-px bg-gradient-to-r from-purple-500/50 via-transparent to-pink-500/50 blur-sm" />
            </motion.div>

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {t("tips") || "Tips"}
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li className="flex gap-2">
                  <span className="text-pink-400">•</span>
                  <span>Use STAR method (Situation, Task, Action, Result)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Include measurable outcomes and metrics</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Keep answers concise and role-focused</span>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
