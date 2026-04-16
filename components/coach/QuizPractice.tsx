"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

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

export function QuizPractice() {
  const { t } = useI18n();
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [quiz, selectedAnswers]);

  const answeredCount = useMemo(() => {
    return selectedAnswers.filter((value) => value >= 0).length;
  }, [selectedAnswers]);

  async function onGenerateQuiz(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedTopic = topic.trim();
    const normalizedSource = sourceText.trim();
    if (!normalizedTopic && !normalizedSource) {
      setError("Enter a topic or paste content to generate MCQs.");
      return;
    }

    setGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch("/api/coach/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic: normalizedTopic,
          sourceText: normalizedSource,
          questionCount,
        }),
      });

      const data = (await response.json()) as { error?: string; quiz?: GeneratedQuiz };
      if (!response.ok || !data.quiz) {
        throw new Error(data.error || "Failed to generate quiz.");
      }

      setQuiz(data.quiz);
      setSelectedAnswers(Array(data.quiz.questions.length).fill(-1));
      setShowResult(false);
    } catch (generationError) {
      const message =
        generationError instanceof Error && generationError.name === "AbortError"
          ? "Quiz generation is taking too long. Please try again."
          : generationError instanceof Error
            ? generationError.message
            : "Failed to generate quiz.";
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
      setError("Please answer all questions before submitting.");
      return;
    }

    setError(null);
    setShowResult(true);
  }

  function onResetAttempt() {
    if (!quiz) return;
    setSelectedAnswers(Array(quiz.questions.length).fill(-1));
    setShowResult(false);
    setError(null);
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t("quizPractice") || "Quiz Practice"}</h2>
          <p className="text-slate-400">Generate topic-based MCQ practice instantly. Add optional source content to create focused questions from your notes.</p>
        </div>

        <form onSubmit={onGenerateQuiz} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter subject or topic (e.g., React Hooks, Bangladesh Banking Math)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
            />
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-purple-500"
            >
              <option value={5}>5 MCQs</option>
              <option value={8}>8 MCQs</option>
              <option value={10}>10 MCQs</option>
              <option value={15}>15 MCQs</option>
            </select>
            <button
              type="submit"
              disabled={generating}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={6}
            placeholder="Optional: paste notes/content/chapter text here to generate MCQs from this material."
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
                New Quiz
              </button>
            ) : null}
            <span className="text-xs text-slate-400">Tip: add both topic and content for best results.</span>
          </div>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}

        {quiz ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
              <p className="mt-1 text-sm text-slate-400">Topic: {quiz.topic || "Custom content"}</p>
              <p className="mt-2 text-sm text-slate-300">
                Answered: {answeredCount}/{quiz.questions.length}
              </p>
              {showResult ? (
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  Score: {score}/{quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
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

                      return (
                        <button
                          key={`${item.id}-${optionIdx}`}
                          type="button"
                          onClick={() => onSelectOption(idx, optionIdx)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                            isCorrect
                              ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                              : isWrongSelected
                                ? "border-red-400/70 bg-red-500/10 text-red-100"
                                : checked
                                  ? "border-purple-400 bg-purple-500/10 text-slate-100"
                                  : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onSelectOption(idx, optionIdx)}
                              className="h-4 w-4"
                            />
                            <span>{option}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {showResult ? (
                    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">Explanation</p>
                      <p className="mt-1">{item.explanation}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="sticky bottom-2 z-10 flex flex-wrap gap-3 rounded-xl border border-slate-700 bg-[#0a0f1e]/95 p-3 backdrop-blur">
              {!showResult ? (
                <button
                  type="button"
                  onClick={onSubmitQuiz}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResetAttempt}
                  className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800/70"
                >
                  Retry Quiz
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
                Clear Answers
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📚</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Topic-Based Quiz</p>
                <p className="text-xs text-slate-400">Generate practice from any subject instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">📄</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Paste Source Content</p>
                <p className="text-xs text-slate-400">Create MCQs directly from your notes/chapter text</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-sm font-medium text-slate-200">Real MCQ Practice</p>
                <p className="text-xs text-slate-400">Checkbox options, score, and explanations</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
