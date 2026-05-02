"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Flame,
  GripVertical,
  Moon,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

type QuizDifficulty = "easy" | "medium" | "hard" | "adaptive";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hash: string;
};

type QuizQuestionReview = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  explanation: string;
  hash: string;
};

type QuizHistoryItem = {
  id: string;
  topic: string;
  difficulty: QuizDifficulty;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  date: string;
  timeTakenMs: number;
  questions: QuizQuestionReview[];
};

type TopicStatsRecord = {
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  lastPracticed: string;
  isWeak: boolean;
};

type QuizStore = {
  user: {
    name: string;
    streakDays: number;
    lastActiveDate: string;
    totalQuizzes: number;
  };
  quizHistory: QuizHistoryItem[];
  topicStats: Record<string, TopicStatsRecord>;
  recentQuestionHashesByTopic: Record<string, string[]>;
};

type ActiveQuizSession = {
  sessionId: string;
  topic: string;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Array<number | null>;
  revealed: boolean[];
  startedAt: number;
};

type QuizView = "dashboard" | "generate" | "quiz";
type QuizStage = "answering" | "results";

type ToastState = {
  tone: "success" | "warning";
  message: string;
} | null;

type TopicSummaryCard = {
  topic: string;
  accuracy: number;
  attempts: number;
  lastPracticed: string;
  isWeak: boolean;
};

type TrendDataPoint = {
  label: string;
  accuracy: number;
};

type QuizApiResponse = {
  error?: string;
  quiz?: {
    title?: string;
    topic?: string;
    sources?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    questions?: Array<{
      id?: string;
      question?: string;
      options?: string[];
      correctIndex?: number;
      explanation?: string;
      hash?: string;
    }>;
  };
};

const STORE_KEY = "chakri.quiz.practice.v2";
const ROTATING_PLACEHOLDERS = ["React Hooks", "Python OOP", "SQL Joins", "Networking Basics", "System Design"];
const QUESTION_COUNT_PRESETS = [5, 10, 15, 20] as const;
const RANDOM_TOPIC_POOL = [
  "Node.js Streams",
  "TypeScript Generics",
  "REST API Design",
  "Data Structures",
  "Operating Systems",
  "Cloud Fundamentals",
  "Java Concurrency",
  "Database Indexing",
  "Docker Basics",
  "Algorithms",
];

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStore(): QuizStore {
  return {
    user: {
      name: "Learner",
      streakDays: 0,
      lastActiveDate: "",
      totalQuizzes: 0,
    },
    quizHistory: [],
    topicStats: {},
    recentQuestionHashesByTopic: {},
  };
}

function parseStore(raw: string | null): QuizStore {
  if (!raw) return createEmptyStore();

  try {
    const parsed = JSON.parse(raw) as Partial<QuizStore>;
    return {
      ...createEmptyStore(),
      ...parsed,
      user: {
        ...createEmptyStore().user,
        ...(parsed.user || {}),
      },
      quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
      topicStats: parsed.topicStats && typeof parsed.topicStats === "object" ? parsed.topicStats : {},
      recentQuestionHashesByTopic:
        parsed.recentQuestionHashesByTopic && typeof parsed.recentQuestionHashesByTopic === "object"
          ? parsed.recentQuestionHashesByTopic
          : {},
    };
  } catch {
    return createEmptyStore();
  }
}

function normalizeTopicKey(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() || "general";
}

function hashQuestionText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toDateKey(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateKey(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function getDifficultyTone(difficulty: QuizDifficulty) {
  if (difficulty === "easy") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  if (difficulty === "hard") return "border-rose-500/30 bg-rose-500/15 text-rose-200";
  if (difficulty === "adaptive") return "border-indigo-400/35 bg-indigo-500/20 text-indigo-100";
  return "border-amber-500/30 bg-amber-500/15 text-amber-200";
}

function scoreTone(value: number) {
  if (value >= 80) return "text-emerald-300";
  if (value >= 60) return "text-amber-300";
  return "text-rose-300";
}

function topicBarTone(accuracy: number) {
  if (accuracy > 80) return "from-emerald-500 to-emerald-400";
  if (accuracy >= 60) return "from-amber-500 to-yellow-400";
  return "from-rose-500 to-red-400";
}

function applyResultToStore(
  current: QuizStore,
  result: QuizHistoryItem,
  questionHashes: string[]
): { nextStore: QuizStore; streakExtended: boolean; newTopicBest: boolean } {
  if (current.quizHistory.some((entry) => entry.id === result.id)) {
    return { nextStore: current, streakExtended: false, newTopicBest: false };
  }

  const topicKey = result.topic.trim();
  const previousTopicStats = current.topicStats[topicKey] || {
    attempts: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    accuracy: 0,
    lastPracticed: "",
    isWeak: false,
  };

  const updatedAttempts = previousTopicStats.attempts + 1;
  const updatedTotalCorrect = previousTopicStats.totalCorrect + result.correctAnswers;
  const updatedTotalQuestions = previousTopicStats.totalQuestions + result.totalQuestions;
  const updatedAccuracy = updatedTotalQuestions > 0 ? Math.round((updatedTotalCorrect / updatedTotalQuestions) * 100) : 0;

  const todayKey = toDateKey(result.date);
  const previousActiveDate = current.user.lastActiveDate ? toDateKey(current.user.lastActiveDate) : "";

  let nextStreak = current.user.streakDays;
  let streakExtended = false;

  if (!previousActiveDate) {
    nextStreak = 1;
    streakExtended = true;
  } else if (previousActiveDate === todayKey) {
    nextStreak = Math.max(1, current.user.streakDays);
  } else if (previousActiveDate === previousDateKey(todayKey)) {
    nextStreak = Math.max(1, current.user.streakDays) + 1;
    streakExtended = true;
  } else {
    nextStreak = 1;
    streakExtended = true;
  }

  const history = [result, ...current.quizHistory].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const topicHashKey = normalizeTopicKey(result.topic);
  const existingHashes = current.recentQuestionHashesByTopic[topicHashKey] || [];
  const mergedHashes = Array.from(new Set([...existingHashes, ...questionHashes.filter(Boolean)])).slice(-50);

  const nextStore: QuizStore = {
    ...current,
    user: {
      ...current.user,
      totalQuizzes: current.user.totalQuizzes + 1,
      streakDays: nextStreak,
      lastActiveDate: result.date,
    },
    quizHistory: history,
    topicStats: {
      ...current.topicStats,
      [topicKey]: {
        attempts: updatedAttempts,
        totalCorrect: updatedTotalCorrect,
        totalQuestions: updatedTotalQuestions,
        accuracy: updatedAccuracy,
        lastPracticed: result.date,
        isWeak: updatedAccuracy < 60,
      },
    },
    recentQuestionHashesByTopic: {
      ...current.recentQuestionHashesByTopic,
      [topicHashKey]: mergedHashes,
    },
  };

  const newTopicBest = result.accuracy > previousTopicStats.accuracy;

  return {
    nextStore,
    streakExtended,
    newTopicBest,
  };
}

function buildHistoryGroups(history: QuizHistoryItem[]) {
  const now = new Date();
  const today = toDateKey(now);
  const yesterday = previousDateKey(today);

  const weekCutoff = new Date(now);
  weekCutoff.setDate(weekCutoff.getDate() - 7);

  const groups: Record<"Today" | "Yesterday" | "This Week" | "Older", QuizHistoryItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  history.forEach((item) => {
    const itemDate = new Date(item.date);
    const itemKey = toDateKey(item.date);

    if (itemKey === today) {
      groups.Today.push(item);
      return;
    }

    if (itemKey === yesterday) {
      groups.Yesterday.push(item);
      return;
    }

    if (itemDate >= weekCutoff) {
      groups["This Week"].push(item);
      return;
    }

    groups.Older.push(item);
  });

  return groups;
}

function AccuracyRing({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0 -rotate-90">
        <circle cx="42" cy="42" r={radius} stroke="rgba(100,116,139,0.3)" strokeWidth="8" fill="none" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          stroke="url(#ring-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <p className="text-xl font-semibold text-slate-50">{normalized}%</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function AnimatedView({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function QuizPractice() {
  const supabase = useSupabase();
  const { resolvedTheme, setTheme } = useTheme();

  const [store, setStore] = useState<QuizStore>(() => createEmptyStore());
  const [hydrated, setHydrated] = useState(false);

  const [activeView, setActiveView] = useState<QuizView>("dashboard");
  const [quizStage, setQuizStage] = useState<QuizStage>("results");
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("adaptive");
  const [questionPreset, setQuestionPreset] = useState<number>(10);
  const [customQuestionCount, setCustomQuestionCount] = useState("12");
  const [useCustomQuestionCount, setUseCustomQuestionCount] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});

  const [interestedTopics, setInterestedTopics] = useState<string[]>([]);
  const [mountedTheme, setMountedTheme] = useState(false);

  useEffect(() => {
    setMountedTheme(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      setStore(parseStore(raw));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [hydrated, store]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIdx((current) => (current + 1) % ROTATING_PLACEHOLDERS.length);
    }, 2400);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;

      const fromMeta =
        (typeof data.user.user_metadata?.full_name === "string" && data.user.user_metadata.full_name.trim()) ||
        (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name.trim()) ||
        "";

      if (fromMeta) {
        setStore((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            name: prev.user.name && prev.user.name !== "Learner" ? prev.user.name : fromMeta,
          },
        }));
      }

      const userId = data.user.id;

      const [profileRes, skillsRes] = await Promise.all([
        supabase.from("profiles").select("target_role").eq("id", userId).maybeSingle(),
        supabase.from("skills").select("name").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

      if (cancelled) return;

      const role = typeof profileRes.data?.target_role === "string" ? profileRes.data.target_role.trim() : "";
      const skills = (skillsRes.data || [])
        .map((item) => (typeof item.name === "string" ? item.name.trim() : ""))
        .filter(Boolean);

      const merged = Array.from(new Set([role, ...skills])).slice(0, 12);
      setInterestedTopics(merged);

      if (merged.length > 0) {
        setTopicInput((current) => (current.trim() ? current : merged[0]));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (activeView !== "quiz" || quizStage !== "answering" || !activeQuiz) return;

    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - activeQuiz.startedAt);
    }, 1000);

    return () => window.clearInterval(id);
  }, [activeView, quizStage, activeQuiz]);

  const history = useMemo(() => {
    return [...store.quizHistory].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [store.quizHistory]);

  const groupedHistory = useMemo(() => buildHistoryGroups(history), [history]);

  const totalQuestionsAnswered = useMemo(() => {
    return history.reduce((sum, item) => sum + item.totalQuestions, 0);
  }, [history]);

  const totalCorrect = useMemo(() => {
    return history.reduce((sum, item) => sum + item.correctAnswers, 0);
  }, [history]);

  const overallAccuracy = useMemo(() => {
    if (totalQuestionsAnswered === 0) return 0;
    return Math.round((totalCorrect / totalQuestionsAnswered) * 100);
  }, [totalCorrect, totalQuestionsAnswered]);

  const weeklyCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return history.filter((item) => new Date(item.date) >= cutoff).length;
  }, [history]);

  const topicCards = useMemo<TopicSummaryCard[]>(() => {
    return Object.entries(store.topicStats)
      .map(([topic, stats]) => ({
        topic,
        accuracy: stats.accuracy,
        attempts: stats.attempts,
        lastPracticed: stats.lastPracticed,
        isWeak: stats.accuracy < 60,
      }))
      .sort((a, b) => Number(b.isWeak) - Number(a.isWeak) || a.accuracy - b.accuracy || b.attempts - a.attempts);
  }, [store.topicStats]);

  const weakTopics = useMemo(() => {
    return topicCards.filter((topic) => topic.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
  }, [topicCards]);

  const mostPracticedTopics = useMemo(() => {
    return topicCards.slice().sort((a, b) => b.attempts - a.attempts).slice(0, 8);
  }, [topicCards]);

  const smartRecommendations = useMemo(() => {
    const weakest = weakTopics[0]?.topic || "Core Fundamentals";
    const strongest = mostPracticedTopics[0]?.topic || "Problem Solving";

    const existing = new Set(topicCards.map((item) => normalizeTopicKey(item.topic)));
    const randomNew = RANDOM_TOPIC_POOL.find((candidate) => !existing.has(normalizeTopicKey(candidate))) || RANDOM_TOPIC_POOL[0];

    return {
      weakest,
      mostPracticed: strongest,
      randomNew,
    };
  }, [mostPracticedTopics, topicCards, weakTopics]);

  const trendData = useMemo<TrendDataPoint[]>(() => {
    return history
      .slice(0, 7)
      .reverse()
      .map((item, index) => ({
        label: item.topic.length > 16 ? `${item.topic.slice(0, 16)}...` : item.topic || `Quiz ${index + 1}`,
        accuracy: item.accuracy,
      }));
  }, [history]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [currentPage, history]);

  const currentQuestionCount = useMemo(() => {
    if (useCustomQuestionCount) {
      const parsed = Number.parseInt(customQuestionCount, 10);
      if (Number.isFinite(parsed)) {
        return Math.max(3, Math.min(30, parsed));
      }

      return 10;
    }

    return questionPreset;
  }, [customQuestionCount, questionPreset, useCustomQuestionCount]);

  const adaptiveContext = useMemo(() => {
    const weak = topicCards
      .filter((item) => item.accuracy < 70)
      .slice(0, 5)
      .map((item) => ({
        topic: item.topic,
        accuracy: item.accuracy,
        attempts: item.attempts,
      }));

    const strong = topicCards
      .filter((item) => item.accuracy >= 80)
      .slice(0, 4)
      .map((item) => ({
        topic: item.topic,
        accuracy: item.accuracy,
        attempts: item.attempts,
      }));

    const targetDifficulty = overallAccuracy > 80 ? "hard" : overallAccuracy < 50 ? "easy" : "medium";

    return {
      weakTopics: weak,
      strongTopics: strong,
      targetDifficulty,
      focusConcepts: [],
    };
  }, [overallAccuracy, topicCards]);

  const activeResult = useMemo(() => {
    if (!selectedResultId) return null;
    return history.find((item) => item.id === selectedResultId) || null;
  }, [history, selectedResultId]);

  const activeQuestion = useMemo(() => {
    if (!activeQuiz) return null;
    return activeQuiz.questions[activeQuiz.currentIndex] || null;
  }, [activeQuiz]);

  const currentSelectedAnswer = useMemo(() => {
    if (!activeQuiz) return null;
    return activeQuiz.answers[activeQuiz.currentIndex];
  }, [activeQuiz]);

  const currentRevealed = useMemo(() => {
    if (!activeQuiz) return false;
    return activeQuiz.revealed[activeQuiz.currentIndex] || false;
  }, [activeQuiz]);

  const quizProgress = useMemo(() => {
    if (!activeQuiz || activeQuiz.questions.length === 0) return 0;

    const completed = activeQuiz.revealed.filter(Boolean).length;
    return Math.round((completed / activeQuiz.questions.length) * 100);
  }, [activeQuiz]);

  const retryTopic = (topic: string, presetDifficulty: QuizDifficulty = "adaptive") => {
    setTopicInput(topic);
    setDifficulty(presetDifficulty);
    setActiveView("generate");
    setQuizStage("results");
    setActionError(null);
    setGenerateError(null);
  };

  const openResult = (historyId: string) => {
    setSelectedResultId(historyId);
    setActiveHistoryId(historyId);
    setActiveView("quiz");
    setQuizStage("results");
    setActiveQuiz(null);
    setActionError(null);
  };

  const deleteHistoryItem = (id: string) => {
    setStore((prev) => ({
      ...prev,
      quizHistory: prev.quizHistory.filter((item) => item.id !== id),
    }));

    if (selectedResultId === id) {
      setSelectedResultId(null);
      setActiveView("dashboard");
    }

    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  async function handleGenerateQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateError(null);
    setActionError(null);

    const topic = topicInput.trim() || weakTopics[0]?.topic || "General Practice";
    const topicHashKey = normalizeTopicKey(topic);
    const excludeQuestionHashes = (store.recentQuestionHashesByTopic[topicHashKey] || []).slice(-50);

    setIsGenerating(true);

    try {
      const response = await fetch("/api/coach/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          sourceText: sourceText.trim(),
          questionCount: currentQuestionCount,
          difficulty,
          researchMode: sourceText.trim() ? "off" : "auto",
          excludeQuestionHashes,
          adaptiveContext,
        }),
      });

      const payload = (await response.json()) as QuizApiResponse;
      if (!response.ok || !payload.quiz?.questions || payload.quiz.questions.length === 0) {
        throw new Error(payload.error || "Could not generate quiz right now.");
      }

      const seenHashes = new Set<string>();
      const normalizedQuestions: QuizQuestion[] = payload.quiz.questions
        .map((item, idx) => {
          const question = typeof item.question === "string" ? item.question.trim() : "";
          const options = Array.isArray(item.options)
            ? item.options.map((opt) => (typeof opt === "string" ? opt.trim() : "")).slice(0, 4)
            : [];
          const correctIndex = typeof item.correctIndex === "number" ? item.correctIndex : -1;

          if (!question || options.length !== 4 || options.some((opt) => !opt) || correctIndex < 0 || correctIndex > 3) {
            return null;
          }

          const hash = typeof item.hash === "string" && item.hash.trim() ? item.hash.trim() : hashQuestionText(question.toLowerCase());
          if (seenHashes.has(hash) || excludeQuestionHashes.includes(hash)) {
            return null;
          }

          seenHashes.add(hash);

          return {
            id: typeof item.id === "string" && item.id.trim() ? item.id : `q-${idx + 1}`,
            question,
            options,
            correctIndex,
            explanation:
              typeof item.explanation === "string" && item.explanation.trim()
                ? item.explanation.trim()
                : "Review the concept and compare each option carefully.",
            hash,
          };
        })
        .filter((item): item is QuizQuestion => Boolean(item));

      if (normalizedQuestions.length < 3) {
        throw new Error("The quiz generator returned too many duplicate questions. Please try again with a slightly different topic.");
      }

      const prepared = normalizedQuestions.slice(0, currentQuestionCount);

      const session: ActiveQuizSession = {
        sessionId: createId(),
        topic: payload.quiz.topic?.trim() || topic,
        difficulty,
        questions: prepared,
        currentIndex: 0,
        answers: Array(prepared.length).fill(null),
        revealed: Array(prepared.length).fill(false),
        startedAt: Date.now(),
      };

      setActiveQuiz(session);
      setElapsedMs(0);
      setSelectedResultId(null);
      setQuizStage("answering");
      setActiveView("quiz");
      setTopicInput(session.topic);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateActiveQuiz(mutator: (quiz: ActiveQuizSession) => ActiveQuizSession) {
    setActiveQuiz((prev) => {
      if (!prev) return prev;
      return mutator(prev);
    });
  }

  function handleSelectOption(optionIndex: number) {
    if (!activeQuiz || currentRevealed) return;

    updateActiveQuiz((prev) => {
      const nextAnswers = [...prev.answers];
      nextAnswers[prev.currentIndex] = optionIndex;
      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }

  function handleSubmitCurrent() {
    if (!activeQuiz) return;

    const selected = activeQuiz.answers[activeQuiz.currentIndex];
    if (selected === null || selected < 0) {
      setActionError("Select an option first.");
      return;
    }

    setActionError(null);

    updateActiveQuiz((prev) => {
      const nextRevealed = [...prev.revealed];
      nextRevealed[prev.currentIndex] = true;
      return {
        ...prev,
        revealed: nextRevealed,
      };
    });
  }

  function handleSkipCurrent() {
    if (!activeQuiz || currentRevealed) return;

    setActionError(null);

    updateActiveQuiz((prev) => {
      const nextRevealed = [...prev.revealed];
      const nextAnswers = [...prev.answers];
      nextAnswers[prev.currentIndex] = null;
      nextRevealed[prev.currentIndex] = true;
      return {
        ...prev,
        answers: nextAnswers,
        revealed: nextRevealed,
      };
    });
  }

  function finalizeQuiz() {
    if (!activeQuiz) return;

    const completedAt = new Date().toISOString();
    const totalQuestions = activeQuiz.questions.length;

    const correctAnswers = activeQuiz.questions.reduce((acc, question, idx) => {
      return acc + (activeQuiz.answers[idx] === question.correctIndex ? 1 : 0);
    }, 0);

    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const questionLog: QuizQuestionReview[] = activeQuiz.questions.map((question, idx) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      selectedIndex: activeQuiz.answers[idx],
      explanation: question.explanation,
      hash: question.hash,
    }));

    const result: QuizHistoryItem = {
      id: activeQuiz.sessionId,
      topic: activeQuiz.topic,
      difficulty: activeQuiz.difficulty,
      totalQuestions,
      correctAnswers,
      accuracy,
      date: completedAt,
      timeTakenMs: Math.max(1000, Date.now() - activeQuiz.startedAt),
      questions: questionLog,
    };

    const { nextStore, streakExtended, newTopicBest } = applyResultToStore(
      store,
      result,
      activeQuiz.questions.map((q) => q.hash)
    );

    setStore(nextStore);
    setSelectedResultId(result.id);
    setActiveHistoryId(result.id);
    setQuizStage("results");
    setActiveQuiz(null);

    if (streakExtended) {
      setToast({
        tone: "success",
        message: `Streak extended to ${nextStore.user.streakDays} day${nextStore.user.streakDays === 1 ? "" : "s"}.`,
      });
    } else if (newTopicBest) {
      setToast({
        tone: "warning",
        message: `New best for ${result.topic}: ${result.accuracy}%`,
      });
    }
  }

  function handleNextQuestion() {
    if (!activeQuiz) return;

    if (!activeQuiz.revealed[activeQuiz.currentIndex]) {
      setActionError("Submit or skip this question first.");
      return;
    }

    if (activeQuiz.currentIndex >= activeQuiz.questions.length - 1) {
      finalizeQuiz();
      return;
    }

    setActionError(null);

    updateActiveQuiz((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }));
  }

  const resultSession = activeResult;
  const darkMode = mountedTheme ? resolvedTheme !== "light" : true;
  const themeScopeClass = darkMode ? "dark" : "light";

  if (!hydrated || !mountedTheme) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0A0A0F] p-8">
        <div className="ui-skeleton h-24 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className={`${themeScopeClass} h-full min-h-0 w-full overflow-x-hidden overflow-y-hidden bg-slate-50 text-slate-900 dark:bg-[#0A0A0F] dark:text-[#F1F5F9]`}>
      <div className="relative flex h-full min-h-0 w-full flex-col lg:flex-row">
        <aside className="border-b border-slate-200/80 bg-white/75 p-3 backdrop-blur-md dark:border-[#1E1E2E] dark:bg-[#111118]/85 lg:h-full lg:w-[320px] lg:min-w-[320px] lg:border-b-0 lg:border-r lg:p-4">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-[#1E1E2E] dark:bg-[#0E0E15]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Quiz Studio AI</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Focused MCQ practice</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveView("generate");
                  setQuizStage("results");
                  setActiveQuiz(null);
                  setSelectedResultId(null);
                  setActionError(null);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                New Quiz
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white/80 p-2 dark:border-[#1E1E2E] dark:bg-[#0E0E15]/85">
              {(["Today", "Yesterday", "This Week", "Older"] as const).map((groupName) => {
                const items = groupedHistory[groupName];
                if (items.length === 0) return null;

                return (
                  <div key={groupName} className="mb-3 last:mb-0">
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {groupName}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const active = activeHistoryId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => openResult(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openResult(item.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className={`group w-full rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ${
                              active
                                ? "border-indigo-400/50 bg-indigo-500/15"
                                : "border-slate-200 bg-white hover:border-indigo-300 dark:border-[#242437] dark:bg-[#12121b] dark:hover:border-indigo-400/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-1 text-xs font-medium">{item.topic}</p>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteHistoryItem(item.id);
                                }}
                                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                title="Delete"
                                aria-label="Delete quiz history"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
                              </button>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-indigo-400/35 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200">
                                {item.accuracy}%
                              </span>
                              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getDifficultyTone(item.difficulty)}`}>
                                {item.difficulty}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-[#2b2b40] dark:text-slate-400">
                  Your quiz history will appear here after the first attempt.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-[#1E1E2E] dark:bg-[#0E0E15]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white dark:bg-indigo-500">
                    {store.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{store.user.name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      {store.user.streakDays} day streak
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme(darkMode ? "light" : "dark")}
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-all duration-200 hover:border-indigo-400 hover:text-indigo-500 dark:border-[#2b2b40] dark:text-slate-300 dark:hover:border-indigo-400"
                    title="Toggle theme"
                    aria-label="Toggle theme"
                  >
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition-all duration-200 hover:border-indigo-400 hover:text-indigo-500 dark:border-[#2b2b40] dark:text-slate-300 dark:hover:border-indigo-400"
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-3 dark:bg-[#0A0A0F] sm:p-4 lg:p-5">
          <AnimatedView viewKey={`${activeView}-${quizStage}-${selectedResultId || "none"}`}>
            {activeView === "dashboard" ? (
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{getGreeting(store.user.name)} 👋</h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Keep momentum today. A focused 10-minute quiz can sharpen weak areas quickly.
                  </p>
                </section>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 backdrop-blur-sm dark:border-[#1E1E2E] dark:bg-[#111118]/75">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Daily Streak</p>
                      <Flame className="h-4 w-4 text-amber-400 motion-safe:animate-pulse" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{store.user.streakDays} days</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 backdrop-blur-sm dark:border-[#1E1E2E] dark:bg-[#111118]/75">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Overall Accuracy</p>
                    <div className="mt-2">
                      <AccuracyRing value={overallAccuracy} label="All quizzes" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 backdrop-blur-sm dark:border-[#1E1E2E] dark:bg-[#111118]/75">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Quizzes Completed</p>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{store.user.totalQuizzes}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 backdrop-blur-sm dark:border-[#1E1E2E] dark:bg-[#111118]/75">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">This Week</p>
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{weeklyCount}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Accuracy Trend</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Last 7 quizzes</span>
                  </div>
                  <div className="mt-3 h-52 w-full">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="accuracy-fill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.38} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" tick={{ fill: darkMode ? "#94A3B8" : "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ stroke: "rgba(99,102,241,0.2)", strokeWidth: 1 }}
                            contentStyle={{
                              borderRadius: 10,
                              border: darkMode ? "1px solid #2a2a40" : "1px solid #e2e8f0",
                              background: darkMode ? "#111118" : "#ffffff",
                              color: darkMode ? "#f8fafc" : "#0f172a",
                            }}
                          />
                          <Area type="monotone" dataKey="accuracy" stroke="none" fill="url(#accuracy-fill)" />
                          <Line type="monotone" dataKey="accuracy" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3, fill: "#8B5CF6" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-[#2b2b40] dark:text-slate-400">
                        Complete a quiz to start your trend line.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Topic Performance</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {topicCards.length > 0 ? (
                      topicCards.map((topic) => (
                        <div key={topic.topic} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#25253a] dark:bg-[#0E0E16]">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{topic.topic}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Last practiced {formatShortDate(topic.lastPracticed)}</p>
                            </div>
                            {topic.accuracy < 60 ? (
                              <span className="rounded-full border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                                Weak
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-300/70 dark:bg-slate-700/40">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${topicBarTone(topic.accuracy)}`}
                              style={{ width: `${topic.accuracy}%` }}
                            />
                          </div>
                          <p className={`mt-2 text-sm font-semibold ${scoreTone(topic.accuracy)}`}>{topic.accuracy}% accuracy</p>
                        </div>
                      ))
                    ) : (
                      <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-[#2b2b40] dark:text-slate-400">
                        Topic insights appear after you complete your first quiz.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Recent Quiz History</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Page {currentPage} of {totalPages}</span>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          <th className="px-2 py-1">Topic</th>
                          <th className="px-2 py-1">Questions</th>
                          <th className="px-2 py-1">Score</th>
                          <th className="px-2 py-1">Accuracy</th>
                          <th className="px-2 py-1">Difficulty</th>
                          <th className="px-2 py-1">Date</th>
                          <th className="px-2 py-1">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.length > 0 ? (
                          paginatedHistory.map((item) => (
                            <tr key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-[#242437] dark:bg-[#0E0E16]">
                              <td className="rounded-l-xl px-2 py-2.5 font-medium">{item.topic}</td>
                              <td className="px-2 py-2.5">{item.totalQuestions}</td>
                              <td className="px-2 py-2.5">{item.correctAnswers}/{item.totalQuestions}</td>
                              <td className={`px-2 py-2.5 font-semibold ${scoreTone(item.accuracy)}`}>{item.accuracy}%</td>
                              <td className="px-2 py-2.5">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getDifficultyTone(item.difficulty)}`}>
                                  {item.difficulty}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400">{formatDateTime(item.date)}</td>
                              <td className="rounded-r-xl px-2 py-2.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => retryTopic(item.topic, item.difficulty)}
                                    className="rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-200 transition-all duration-200 hover:bg-indigo-500/25"
                                  >
                                    Retry
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openResult(item.id)}
                                    className="rounded-lg border border-slate-400/35 bg-slate-700/15 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-700/25"
                                  >
                                    Review
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-[#2b2b40] dark:text-slate-400">
                              No quiz sessions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-[#2b2b40]"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-[#2b2b40]"
                    >
                      Next
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {activeView === "generate" ? (
              <div className="mx-auto w-full max-w-5xl space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-6">
                  <div className="mx-auto max-w-3xl">
                    <h2 className="text-xl font-semibold tracking-tight">Generate an AI Quiz</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Build focused MCQ sessions from a topic, web research, your weak areas, or your own notes.
                    </p>

                    <form onSubmit={handleGenerateQuiz} className="mt-5 space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          What do you want to practice today?
                        </label>
                        <input
                          value={topicInput}
                          onChange={(event) => setTopicInput(event.target.value)}
                          placeholder={ROTATING_PLACEHOLDERS[placeholderIdx]}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-400 dark:border-[#2a2a40] dark:bg-[#0D0D16]"
                        />

                        {mostPracticedTopics.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {mostPracticedTopics.slice(0, 6).map((item) => (
                              <button
                                key={`history-${item.topic}`}
                                type="button"
                                onClick={() => setTopicInput(item.topic)}
                                className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-indigo-400 dark:border-[#2a2a40] dark:bg-[#10101A]"
                              >
                                {item.topic}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {weakTopics.length > 0 ? (
                          <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Weak Topics</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {weakTopics.slice(0, 5).map((item) => (
                                <button
                                  key={`weak-${item.topic}`}
                                  type="button"
                                  onClick={() => setTopicInput(item.topic)}
                                  className="rounded-full border border-rose-400/35 bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-100 transition-all duration-200 hover:bg-rose-500/30"
                                >
                                  {item.topic}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {interestedTopics.length > 0 ? (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0F0F17]">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Profile Topics</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {interestedTopics.slice(0, 8).map((topic) => (
                                <button
                                  key={`profile-${topic}`}
                                  type="button"
                                  onClick={() => setTopicInput(topic)}
                                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-indigo-400 dark:border-[#2a2a40] dark:bg-[#11111a]"
                                >
                                  {topic}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0F0F17]">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Number of Questions</p>
                          <div className="flex flex-wrap gap-2">
                            {QUESTION_COUNT_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setQuestionPreset(preset);
                                  setUseCustomQuestionCount(false);
                                }}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                                  !useCustomQuestionCount && questionPreset === preset
                                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                                    : "border-slate-300 bg-white dark:border-[#2a2a40] dark:bg-[#11111A]"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setUseCustomQuestionCount(true)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                                useCustomQuestionCount
                                  ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                                  : "border-slate-300 bg-white dark:border-[#2a2a40] dark:bg-[#11111A]"
                              }`}
                            >
                              Custom
                            </button>
                          </div>

                          {useCustomQuestionCount ? (
                            <input
                              value={customQuestionCount}
                              onChange={(event) => setCustomQuestionCount(event.target.value)}
                              placeholder="Enter question count (3-30)"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-indigo-400 dark:border-[#2a2a40] dark:bg-[#11111A]"
                            />
                          ) : null}
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0F0F17]">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Difficulty</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(["easy", "medium", "hard", "adaptive"] as const).map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setDifficulty(level)}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-all duration-200 ${
                                  difficulty === level
                                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                                    : "border-slate-300 bg-white dark:border-[#2a2a40] dark:bg-[#11111A]"
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0F0F17]">
                        <button
                          type="button"
                          onClick={() => setNotesOpen((open) => !open)}
                          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                        >
                          Optional Notes or Chapter Text
                          {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {notesOpen ? (
                          <textarea
                            value={sourceText}
                            onChange={(event) => setSourceText(event.target.value)}
                            rows={6}
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-indigo-400 dark:border-[#2a2a40] dark:bg-[#11111A]"
                            placeholder="Paste your notes, chapter snippets, or key points here"
                          />
                        ) : null}
                      </div>

                      {generateError ? (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                          {generateError}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isGenerating ? <GripVertical className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isGenerating ? `Generating ${currentQuestionCount} questions on ${topicInput || "your topic"}...` : "Generate Quiz"}
                      </button>
                    </form>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Based on your history, we recommend:
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {[
                      {
                        title: "Weakest Topic",
                        topic: smartRecommendations.weakest,
                        meta: "Strengthen low-accuracy area",
                        tone: "border-rose-500/25 bg-rose-500/10",
                      },
                      {
                        title: "Most Practiced",
                        topic: smartRecommendations.mostPracticed,
                        meta: "Deepen high-repetition skills",
                        tone: "border-indigo-500/25 bg-indigo-500/10",
                      },
                      {
                        title: "Try Something New",
                        topic: smartRecommendations.randomNew,
                        meta: "Expand topic coverage",
                        tone: "border-emerald-500/25 bg-emerald-500/10",
                      },
                    ].map((card) => (
                      <button
                        key={card.title}
                        type="button"
                        onClick={() => setTopicInput(card.topic)}
                        className={`rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${card.tone}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{card.title}</p>
                        <p className="mt-1 text-sm font-semibold">{card.topic}</p>
                        <p className="mt-1 text-xs text-slate-400">{card.meta}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeView === "quiz" ? (
              <div className="mx-auto w-full max-w-5xl">
                {quizStage === "answering" && activeQuiz && activeQuestion ? (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{activeQuiz.topic}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Question {activeQuiz.currentIndex + 1} of {activeQuiz.questions.length}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-300">
                            <Clock3 className="h-4 w-4" />
                            {formatMs(elapsedMs)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuiz(null);
                              setActiveView("dashboard");
                              setQuizStage("results");
                            }}
                            className="rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-all duration-200 hover:bg-rose-500/25"
                          >
                            Quit
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{quizProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/70">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-200"
                            style={{ width: `${quizProgress}%` }}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="mx-auto w-full max-w-[680px] rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-6">
                      <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/35 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100">
                        Q{activeQuiz.currentIndex + 1}
                      </div>

                      <p className="text-[1.06rem] leading-7 sm:text-[1.14rem]">{activeQuestion.question}</p>

                      <div className="mt-4 space-y-2">
                        {activeQuestion.options.map((option, optionIndex) => {
                          const selected = currentSelectedAnswer === optionIndex;
                          const correct = currentRevealed && optionIndex === activeQuestion.correctIndex;
                          const wrongSelected =
                            currentRevealed &&
                            currentSelectedAnswer === optionIndex &&
                            optionIndex !== activeQuestion.correctIndex;

                          return (
                            <button
                              key={`${activeQuestion.id}-${optionIndex}`}
                              type="button"
                              onClick={() => handleSelectOption(optionIndex)}
                              disabled={currentRevealed}
                              className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 ${
                                correct
                                  ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-100"
                                  : wrongSelected
                                    ? "border-rose-500/45 bg-rose-500/20 text-rose-100"
                                    : selected
                                      ? "border-indigo-500/45 bg-indigo-500/20 text-indigo-100"
                                      : "border-slate-300 bg-slate-50 hover:border-indigo-300 dark:border-[#2a2a40] dark:bg-[#0F0F18] dark:hover:border-indigo-400"
                              }`}
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400/50 text-xs font-semibold">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                <span className="flex-1">{option}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {currentRevealed ? (
                        <div
                          className={`mt-4 rounded-xl border px-3 py-2.5 text-sm ${
                            currentSelectedAnswer === activeQuestion.correctIndex
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-100"
                          }`}
                        >
                          {currentSelectedAnswer === activeQuestion.correctIndex ? (
                            <p className="font-medium">Correct. Nice work.</p>
                          ) : (
                            <p className="font-medium">
                              Incorrect. Correct answer: {String.fromCharCode(65 + activeQuestion.correctIndex)}
                            </p>
                          )}
                          <p className="mt-1 text-xs opacity-90">{activeQuestion.explanation}</p>
                        </div>
                      ) : null}

                      {actionError ? (
                        <p className="mt-3 text-sm text-rose-300">{actionError}</p>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {!currentRevealed ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSubmitCurrent}
                              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95"
                            >
                              Submit Answer
                            </button>
                            <button
                              type="button"
                              onClick={handleSkipCurrent}
                              className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 transition-all duration-200 hover:bg-amber-500/25"
                            >
                              Skip
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-95"
                          >
                            {activeQuiz.currentIndex >= activeQuiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
                          </button>
                        )}
                      </div>
                    </section>
                  </div>
                ) : null}

                {quizStage === "results" && resultSession ? (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Results</p>
                          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                            {resultSession.accuracy >= 75 ? "Great job." : "Keep practicing."}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {resultSession.topic} · {formatDateTime(resultSession.date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0F0F17]">
                          <AccuracyRing value={resultSession.accuracy} label="Final Accuracy" />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0E0E16]">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Correct</p>
                          <p className="mt-1 text-xl font-semibold text-emerald-300">{resultSession.correctAnswers}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0E0E16]">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Wrong</p>
                          <p className="mt-1 text-xl font-semibold text-rose-300">
                            {resultSession.questions.filter((q) => q.selectedIndex !== null && q.selectedIndex !== q.correctIndex).length}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0E0E16]">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Skipped</p>
                          <p className="mt-1 text-xl font-semibold text-amber-300">
                            {resultSession.questions.filter((q) => q.selectedIndex === null).length}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2a2a40] dark:bg-[#0E0E16]">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Time Taken</p>
                          <p className="mt-1 text-xl font-semibold text-indigo-300">{formatMs(resultSession.timeTakenMs)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => retryTopic(resultSession.topic, resultSession.difficulty)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-200 transition-all duration-200 hover:bg-indigo-500/25"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retry Same Topic
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const weak = weakTopics[0]?.topic || resultSession.topic;
                            retryTopic(weak, "adaptive");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200 transition-all duration-200 hover:bg-amber-500/25"
                        >
                          <Target className="h-4 w-4" />
                          Practice Weak Topics
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView("generate");
                            setActiveQuiz(null);
                            setSelectedResultId(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold transition-all duration-200 hover:border-indigo-300 dark:border-[#2a2a40]"
                        >
                          <Plus className="h-4 w-4" />
                          New Quiz
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView("dashboard")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold transition-all duration-200 hover:border-indigo-300 dark:border-[#2a2a40]"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1E1E2E] dark:bg-[#111118] sm:p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                        Per-question review
                      </h3>
                      <div className="mt-3 space-y-2">
                        {resultSession.questions.map((question, idx) => {
                          const expanded = expandedReviewIds[`${resultSession.id}-${question.id}`] || false;
                          const correct = question.selectedIndex === question.correctIndex;

                          return (
                            <div
                              key={`${resultSession.id}-${question.id}`}
                              className={`rounded-xl border p-3 ${
                                question.selectedIndex === null
                                  ? "border-amber-500/30 bg-amber-500/10"
                                  : correct
                                    ? "border-emerald-500/30 bg-emerald-500/10"
                                    : "border-rose-500/30 bg-rose-500/10"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedReviewIds((prev) => ({
                                    ...prev,
                                    [`${resultSession.id}-${question.id}`]: !expanded,
                                  }))
                                }
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
                                <div>
                                  <p className="text-sm font-semibold">Q{idx + 1}. {question.question}</p>
                                  <p className="mt-1 text-xs text-slate-300">
                                    Your answer: {question.selectedIndex === null ? "Skipped" : String.fromCharCode(65 + question.selectedIndex)} · Correct: {String.fromCharCode(65 + question.correctIndex)}
                                  </p>
                                </div>
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>

                              {expanded ? (
                                <div className="mt-2 space-y-1.5 text-sm">
                                  {question.options.map((option, optionIdx) => (
                                    <p
                                      key={`${question.id}-${optionIdx}`}
                                      className={`rounded-md border px-2 py-1 ${
                                        optionIdx === question.correctIndex
                                          ? "border-emerald-500/30 bg-emerald-500/10"
                                          : optionIdx === question.selectedIndex && optionIdx !== question.correctIndex
                                            ? "border-rose-500/30 bg-rose-500/10"
                                            : "border-slate-300/60 bg-slate-100/50 dark:border-[#2a2a40] dark:bg-[#0E0E16]"
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optionIdx)}. {option}
                                    </p>
                                  ))}
                                  <p className="rounded-md border border-slate-300/60 bg-slate-100/50 px-2 py-1 text-xs text-slate-600 dark:border-[#2a2a40] dark:bg-[#0E0E16] dark:text-slate-300">
                                    {question.explanation}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                ) : null}

                {quizStage === "results" && !resultSession ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-[#2a2a40] dark:bg-[#111118] dark:text-slate-400">
                    No results selected. Start a new quiz from the left sidebar.
                  </div>
                ) : null}
              </div>
            ) : null}
          </AnimatedView>
        </main>

        {toast ? (
          <div className="pointer-events-none fixed bottom-4 right-4 z-50">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${
                toast.tone === "success"
                  ? "border-emerald-500/35 bg-emerald-500/20 text-emerald-100"
                  : "border-amber-500/35 bg-amber-500/20 text-amber-100"
              }`}
            >
              {toast.message}
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
