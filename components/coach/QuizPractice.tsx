"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { fetchAdaptiveSnapshot, syncAdaptiveSignals } from "@/lib/adaptiveIntelligenceClient";
import {
  createEmptyAdaptiveStore,
  getAdaptiveInsights,
  parseAdaptiveStore,
  recordAdaptiveAttempt,
  toAdaptiveRequestContext,
  type QuizAdaptiveStore,
} from "@/lib/quizAdaptive";
import { AdaptiveSyncResponse } from "@/types/adaptiveIntelligence";

type QuizItem = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type GeneratedQuiz = {
  title: string;
  topic: string;
  questions: QuizItem[];
};

const ADAPTIVE_STORAGE_KEY = "chakri.adaptive-quiz.v1";

function getDifficultyBadgeColor(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "hard") return "border-rose-400/40 bg-rose-500/10 text-rose-200";
  if (difficulty === "easy") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
}

export function QuizPractice() {
  const { t } = useI18n();
  const supabase = useSupabase();
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [adaptiveStore, setAdaptiveStore] = useState<QuizAdaptiveStore>(() => createEmptyAdaptiveStore());
  const [adaptiveReady, setAdaptiveReady] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<AdaptiveSyncResponse["profile"] | null>(null);
  const [cloudContext, setCloudContext] = useState<AdaptiveSyncResponse["context"] | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ADAPTIVE_STORAGE_KEY);
      setAdaptiveStore(parseAdaptiveStore(saved));
    } finally {
      setAdaptiveReady(true);
    }
  }, []);

  useEffect(() => {
    if (!adaptiveReady) return;
    window.localStorage.setItem(ADAPTIVE_STORAGE_KEY, JSON.stringify(adaptiveStore));
  }, [adaptiveReady, adaptiveStore]);

  useEffect(() => {
    if (!adaptiveReady || !supabase) return;

    let cancelled = false;

    void (async () => {
      const snapshot = await fetchAdaptiveSnapshot(supabase);
      if (!snapshot || cancelled) return;

      setCloudProfile(snapshot.profile);
      setCloudContext(snapshot.context);
    })();

    return () => {
      cancelled = true;
    };
  }, [adaptiveReady, supabase]);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [quiz, selectedAnswers]);

  const answeredCount = useMemo(() => {
    return selectedAnswers.filter((value) => value >= 0).length;
  }, [selectedAnswers]);

  const answerProgress = useMemo(() => {
    if (!quiz || quiz.questions.length === 0) return 0;
    return Math.round((answeredCount / quiz.questions.length) * 100);
  }, [answeredCount, quiz]);

  const adaptiveTopic = useMemo(() => {
    return (quiz?.topic || topic || "General Practice").trim();
  }, [quiz?.topic, topic]);

  const adaptiveInsights = useMemo(() => {
    return getAdaptiveInsights(adaptiveStore, adaptiveTopic);
  }, [adaptiveStore, adaptiveTopic]);

  const mergedAdaptiveContext = useMemo(() => {
    const local = toAdaptiveRequestContext(adaptiveInsights);
    if (!cloudContext) {
      return local;
    }

    const weakMap = new Map<string, { topic: string; accuracy: number; attempts: number }>();
    [...local.weakTopics, ...cloudContext.weakTopics].forEach((item) => {
      const key = item.topic.toLowerCase().trim();
      if (!key) return;

      const existing = weakMap.get(key);
      if (!existing) {
        weakMap.set(key, item);
        return;
      }

      if (item.accuracy <= existing.accuracy) {
        weakMap.set(key, {
          topic: item.topic,
          accuracy: Math.min(existing.accuracy, item.accuracy),
          attempts: Math.max(existing.attempts, item.attempts),
        });
      }
    });

    const strongMap = new Map<string, { topic: string; accuracy: number; attempts: number }>();
    [...local.strongTopics, ...cloudContext.strongTopics].forEach((item) => {
      const key = item.topic.toLowerCase().trim();
      if (!key) return;

      const existing = strongMap.get(key);
      if (!existing) {
        strongMap.set(key, item);
        return;
      }

      if (item.accuracy >= existing.accuracy) {
        strongMap.set(key, {
          topic: item.topic,
          accuracy: Math.max(existing.accuracy, item.accuracy),
          attempts: Math.max(existing.attempts, item.attempts),
        });
      }
    });

    const focusConcepts = Array.from(new Set([...local.focusConcepts, ...cloudContext.focusConcepts])).slice(0, 8);

    return {
      weakTopics: Array.from(weakMap.values()).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, 5),
      strongTopics: Array.from(strongMap.values()).sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts).slice(0, 4),
      focusConcepts,
      targetDifficulty: cloudContext.targetDifficulty || local.targetDifficulty,
    };
  }, [adaptiveInsights, cloudContext]);

  const recommendationFeed = useMemo(() => {
    return Array.from(new Set([...(cloudContext?.recommendations || []), ...adaptiveInsights.recommendations])).slice(0, 6);
  }, [adaptiveInsights.recommendations, cloudContext?.recommendations]);

  const displayAttempts = useMemo(() => {
    return Math.max(adaptiveInsights.totalAttempts, cloudProfile?.quiz_attempts ?? 0);
  }, [adaptiveInsights.totalAttempts, cloudProfile?.quiz_attempts]);

  const displayAccuracy = useMemo(() => {
    if (cloudProfile && cloudProfile.quiz_attempts >= adaptiveInsights.totalAttempts) {
      return Math.round(cloudProfile.quiz_accuracy_avg);
    }

    return Math.round(adaptiveInsights.overallAccuracy);
  }, [adaptiveInsights.overallAccuracy, adaptiveInsights.totalAttempts, cloudProfile]);

  async function onGenerateQuiz(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedTopic = topic.trim();
    const normalizedSource = sourceText.trim();
    const suggestedWeakTopic = adaptiveInsights.weakTopics[0]?.topic || "";
    const requestTopic = normalizedTopic || (!normalizedSource ? suggestedWeakTopic : "");

    if (!requestTopic && !normalizedSource) {
      setError(t("quizTopicOrContentRequired"));
      return;
    }

    if (!normalizedTopic && requestTopic && !normalizedSource) {
      setTopic(requestTopic);
    }

    setGenerating(true);
    const controller = new AbortController();
    const requestTimeoutMs = questionCount >= 100 ? 120000 : questionCount >= 50 ? 90000 : 25000;
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch("/api/coach/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic: requestTopic,
          sourceText: normalizedSource,
          questionCount,
          adaptiveContext: mergedAdaptiveContext,
        }),
      });

      const data = (await response.json()) as { error?: string; quiz?: GeneratedQuiz };
      if (!response.ok || !data.quiz) {
        throw new Error(data.error || t("quizCreateFailed"));
      }

      setQuiz(data.quiz);
      setSelectedAnswers(Array(data.quiz.questions.length).fill(-1));
      setShowResult(false);
    } catch (generationError) {
      const message =
        generationError instanceof Error && generationError.name === "AbortError"
          ? t("quizGenerationTimeout")
          : generationError instanceof Error
            ? generationError.message
            : t("quizCreateFailed");
      setError(message);
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  }

  function onSelectOption(questionIndex: number, optionIndex: number) {
    if (showResult) return;

    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  function onSubmitQuiz() {
    if (!quiz) return;
    if (answeredCount !== quiz.questions.length) {
      setError(t("quizAnswerAllRequired"));
      return;
    }

    setError(null);
    setShowResult(true);

    const attemptTopic = quiz.topic || topic || t("quizGeneralPractice");
    const nextStore = recordAdaptiveAttempt(adaptiveStore, {
      topic: attemptTopic,
      questions: quiz.questions.map((item) => ({
        question: item.question,
        correctIndex: item.correctIndex,
      })),
      answers: selectedAnswers,
    });

    setAdaptiveStore(nextStore);

    const nextInsights = getAdaptiveInsights(nextStore, attemptTopic);
    const nextContext = toAdaptiveRequestContext(nextInsights);
    const accuracy = quiz.questions.length > 0 ? (score / quiz.questions.length) * 100 : 0;

    void syncAdaptiveSignals(supabase, {
      signals: [
        {
          domain: "quiz",
          signalType: "quiz_attempt_submitted",
          metricValue: accuracy,
          source: "quiz_practice",
          payload: {
            topic: attemptTopic,
            score,
            total: quiz.questions.length,
            accuracy: Math.round(accuracy),
            targetDifficulty: nextContext.targetDifficulty,
          },
        },
        {
          domain: "recommendation",
          signalType: "quiz_recommendation_snapshot",
          metricValue: nextInsights.recommendations.length,
          source: "quiz_practice",
          payload: {
            recommendations: nextInsights.recommendations,
          },
        },
      ],
      summary: {
        quiz: {
          attemptsIncrement: 1,
          accuracy,
          topic: attemptTopic,
          weakTopics: nextContext.weakTopics.map((item) => item.topic),
          strongTopics: nextContext.strongTopics.map((item) => item.topic),
          targetDifficulty: nextContext.targetDifficulty,
        },
        recommendations: recommendationFeed,
      },
    }).then((snapshot) => {
      if (!snapshot) return;
      setCloudProfile(snapshot.profile);
      setCloudContext(snapshot.context);
    });
  }

  function onResetAttempt() {
    if (!quiz) return;
    setSelectedAnswers(Array(quiz.questions.length).fill(-1));
    setShowResult(false);
    setError(null);
  }

  return (
    <div className="ui-page flex h-full min-h-0 flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t("quizPractice") || "Quiz Practice"}</h2>
          <p className="text-slate-400">{t("quizAdaptiveHint")}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{t("quizNextStep")}</p>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{t("quizAdaptiveProgress")}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyBadgeColor(adaptiveInsights.targetDifficulty)}`}>
              {t("quizTargetDifficulty")}: {adaptiveInsights.targetDifficulty}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-400">{t("quizAttempts")}</p>
              <p className="mt-1 text-xl font-semibold text-white">{displayAttempts}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-400">{t("quizOverallAccuracy")}</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{displayAccuracy}%</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-400">{t("quizWeakTopics")}</p>
              <p className="mt-1 text-xl font-semibold text-rose-300">{mergedAdaptiveContext.weakTopics.length}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs text-slate-400">{t("quizStrongTopics")}</p>
              <p className="mt-1 text-xl font-semibold text-cyan-300">{mergedAdaptiveContext.strongTopics.length}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3">
              <p className="text-xs text-orange-200/80">{t("quizDailyStreak")}</p>
              <p className="mt-1 text-lg font-semibold text-orange-100">🔥 {adaptiveInsights.streaks.daily} {t("days")}</p>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-200/80">{t("quizCompletionStreak")}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-100">✅ {adaptiveInsights.streaks.completion} {t("quizAttempts")}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
              <p className="text-xs text-cyan-200/80">{t("quizCorrectAnswerStreak")}</p>
              <p className="mt-1 text-lg font-semibold text-cyan-100">🎯 {adaptiveInsights.streaks.correctAnswer} {t("current")} ({adaptiveInsights.streaks.bestCorrectAnswer} {t("best")})</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-sm font-semibold text-slate-200">{t("quizAiRecommendations")}</p>
              <div className="mt-3 space-y-2">
                {recommendationFeed.map((line, idx) => (
                  <p key={`${line}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition-all duration-300">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-sm font-semibold text-slate-200">{t("quizWeakAreaFocus")}</p>
              <div className="mt-3 space-y-3">
                {mergedAdaptiveContext.weakTopics.slice(0, 3).map((weakTopic) => (
                  <div key={weakTopic.topic} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                      <span className="truncate">{weakTopic.topic}</span>
                      <span>{Math.round(weakTopic.accuracy)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${Math.max(6, Math.min(100, weakTopic.accuracy))}%` }}
                      />
                    </div>
                  </div>
                ))}
                {mergedAdaptiveContext.weakTopics.length === 0 ? <p className="text-xs text-slate-400">{t("quizNoWeakTopics")}</p> : null}
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={onGenerateQuiz} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("quizTopicPlaceholder")}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
            />
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
            >
              <option value={5}>5 {t("mcqs")}</option>
              <option value={8}>8 {t("mcqs")}</option>
              <option value={10}>10 {t("mcqs")}</option>
              <option value={15}>15 {t("mcqs")}</option>
              <option value={25}>25 {t("mcqs")}</option>
              <option value={50}>50 {t("mcqs")}</option>
              <option value={100}>100 {t("mcqs")}</option>
            </select>
            <button
              type="submit"
              disabled={generating}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {generating ? t("quizGenerating") : t("generateQuiz")}
            </button>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={6}
            placeholder={t("quizSourcePlaceholder")}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            {quiz ? (
              <button
                type="button"
                onClick={() => {
                  setQuiz(null);
                  setSelectedAnswers([]);
                  setShowResult(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800/70"
              >
                {t("quizNewQuiz")}
              </button>
            ) : null}
            <span className="text-xs text-slate-400">{t("quizTip")}</span>
          </div>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}

        {generating && !quiz ? (
          <div className="ui-skeleton p-4">
            <div className="space-y-3">
              <div className="ui-skeleton-line h-5 w-1/3" />
              <div className="ui-skeleton-line w-2/3" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="ui-skeleton h-28" />
                <div className="ui-skeleton h-28" />
              </div>
              <p className="text-xs text-slate-400">{t("quizPreparingAdaptive")}</p>
            </div>
          </div>
        ) : null}

        {quiz ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{t("quizTopicLabel")}: {quiz.topic || t("quizCustomContent")}</p>
              <p className="mt-2 text-sm text-slate-300">
                {t("quizAnswered")}: {answeredCount}/{quiz.questions.length}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{t("quizProgress")}</span>
                  <span>{answerProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${answerProgress}%` }}
                  />
                </div>
              </div>
              {showResult ? (
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  {t("score")}: {score}/{quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              {quiz.questions.map((item, idx) => (
                <article key={item.id} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-sm font-semibold text-slate-100">
                    {idx + 1}. {item.question}
                  </p>

                  <div className="mt-3 space-y-2">
                    {item.options.map((option, optionIdx) => {
                      const checked = selectedAnswers[idx] === optionIdx;
                      const isCorrect = showResult && optionIdx === item.correctIndex;
                      const isWrongSelected = showResult && checked && optionIdx !== item.correctIndex;
                      const optionLabel = String.fromCharCode(65 + optionIdx);

                      return (
                        <button
                          key={`${item.id}-${optionIdx}`}
                          type="button"
                          onClick={() => onSelectOption(idx, optionIdx)}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all duration-300 ${
                            isCorrect
                              ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                              : isWrongSelected
                                ? "border-red-400/70 bg-red-500/10 text-red-100"
                                : checked
                                  ? "border-purple-400 bg-purple-500/10 text-slate-100"
                                  : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className="inline-flex w-full items-center gap-3">
                            <span
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                                checked ? "border-purple-300 bg-purple-500/30 text-white" : "border-slate-600 text-slate-300"
                              }`}
                            >
                              {optionLabel}
                            </span>
                            <span className="flex-1">{option}</span>
                            {!showResult && checked ? <span className="text-[11px] font-semibold text-purple-200">{t("quizSelected")}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {showResult ? (
                    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">{t("quizExplanation")}</p>
                      <p className="mt-1">{item.explanation}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-[#0a0f1e]/95 p-3">
              {!showResult ? (
                <button
                  type="button"
                  onClick={onSubmitQuiz}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700"
                >
                  {t("quizSubmitAnswers")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResetAttempt}
                  className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800/70"
                >
                  {t("quizRetry")}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedAnswers(Array(quiz.questions.length).fill(-1));
                  setShowResult(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800/70"
              >
                {t("quizResetAnswers")}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📚</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{t("quizTopicBased")}</p>
                <p className="text-xs text-slate-400">{t("quizTopicBasedHint")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📄</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{t("quizPasteSource")}</p>
                <p className="text-xs text-slate-400">{t("quizPasteSourceHint")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-sm font-medium text-slate-200">{t("quizRealPractice")}</p>
                <p className="text-xs text-slate-400">{t("quizRealPracticeHint")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector("form");
                if (form) {
                  form.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/20"
            >
              {t("quizStartFirst")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
