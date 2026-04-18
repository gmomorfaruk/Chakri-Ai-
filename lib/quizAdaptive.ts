export type DifficultyBand = "easy" | "medium" | "hard";

type TopicPerformanceRecord = {
  displayTopic: string;
  attempts: number;
  correctAnswers: number;
  totalQuestions: number;
  wrongConcepts: Record<string, number>;
  recentAccuracies: number[];
  lastAttemptAt: string;
};

export type QuizAdaptiveStore = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  attempts: Array<{
    topic: string;
    topicKey: string;
    score: number;
    total: number;
    accuracy: number;
    completedAt: string;
    correctPattern: boolean[];
  }>;
  topics: Record<string, TopicPerformanceRecord>;
  streaks: {
    daily: number;
    completion: number;
    correctAnswer: number;
    bestCorrectAnswer: number;
    lastAttemptDate: string | null;
  };
};

export type TopicPerformanceSummary = {
  topic: string;
  attempts: number;
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
  weakConcepts: string[];
};

export type AdaptiveInsights = {
  totalAttempts: number;
  overallAccuracy: number;
  targetDifficulty: DifficultyBand;
  weakTopics: TopicPerformanceSummary[];
  strongTopics: TopicPerformanceSummary[];
  focusConcepts: string[];
  recommendations: string[];
  streaks: QuizAdaptiveStore["streaks"];
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "being",
  "between",
  "could",
  "does",
  "from",
  "have",
  "into",
  "only",
  "should",
  "their",
  "these",
  "those",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
]);

function utcDateKey(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousUtcDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDateKey(date);
}

function normalizeTopicKey(topic: string) {
  const normalized = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "general";
}

function sanitizeTopicLabel(topic: string) {
  const trimmed = topic.trim();
  return trimmed.length > 0 ? trimmed : "General Practice";
}

function extractConcepts(question: string) {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  return Array.from(new Set(words)).slice(0, 3);
}

function toSummary(record: TopicPerformanceRecord): TopicPerformanceSummary {
  const accuracy = record.totalQuestions > 0 ? (record.correctAnswers / record.totalQuestions) * 100 : 0;
  const weakConcepts = Object.entries(record.wrongConcepts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([concept]) => concept);

  return {
    topic: record.displayTopic,
    attempts: record.attempts,
    accuracy,
    correctAnswers: record.correctAnswers,
    totalQuestions: record.totalQuestions,
    weakConcepts,
  };
}

function getAllTopicSummaries(store: QuizAdaptiveStore) {
  return Object.values(store.topics)
    .map((record) => toSummary(record))
    .sort((a, b) => b.attempts - a.attempts || a.accuracy - b.accuracy);
}

function computeOverallAccuracy(store: QuizAdaptiveStore) {
  const allTopics = Object.values(store.topics);
  const totalQuestions = allTopics.reduce((sum, topic) => sum + topic.totalQuestions, 0);
  if (totalQuestions === 0) return 0;

  const totalCorrect = allTopics.reduce((sum, topic) => sum + topic.correctAnswers, 0);
  return (totalCorrect / totalQuestions) * 100;
}

function getTopicImprovement(store: QuizAdaptiveStore, topicKey: string) {
  const recent = store.attempts
    .filter((attempt) => attempt.topicKey === topicKey)
    .slice(-2);

  if (recent.length < 2) {
    return null;
  }

  return recent[1].accuracy - recent[0].accuracy;
}

function computeTargetDifficulty(currentAccuracy: number) {
  if (currentAccuracy > 80) return "hard" as const;
  if (currentAccuracy < 50) return "easy" as const;
  return "medium" as const;
}

export function createEmptyAdaptiveStore(): QuizAdaptiveStore {
  const now = new Date().toISOString();

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    attempts: [],
    topics: {},
    streaks: {
      daily: 0,
      completion: 0,
      correctAnswer: 0,
      bestCorrectAnswer: 0,
      lastAttemptDate: null,
    },
  };
}

export function parseAdaptiveStore(raw: string | null): QuizAdaptiveStore {
  if (!raw) {
    return createEmptyAdaptiveStore();
  }

  try {
    const parsed = JSON.parse(raw) as QuizAdaptiveStore;
    if (parsed && parsed.version === 1 && parsed.topics && parsed.streaks) {
      return {
        ...createEmptyAdaptiveStore(),
        ...parsed,
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
        topics: parsed.topics || {},
        streaks: {
          ...createEmptyAdaptiveStore().streaks,
          ...(parsed.streaks || {}),
        },
      };
    }
  } catch {
    // Ignore parsing errors and reset analytics safely.
  }

  return createEmptyAdaptiveStore();
}

export function recordAdaptiveAttempt(
  store: QuizAdaptiveStore,
  input: {
    topic: string;
    questions: Array<{ question: string; correctIndex: number }>;
    answers: number[];
    completedAt?: string;
  }
): QuizAdaptiveStore {
  const completedAt = input.completedAt || new Date().toISOString();
  const total = input.questions.length;
  if (total === 0) {
    return store;
  }

  const topicLabel = sanitizeTopicLabel(input.topic);
  const topicKey = normalizeTopicKey(topicLabel);

  const correctPattern = input.questions.map((question, idx) => input.answers[idx] === question.correctIndex);
  const score = correctPattern.filter(Boolean).length;
  const accuracy = (score / total) * 100;

  const previousTopic = store.topics[topicKey];
  const updatedWrongConcepts: Record<string, number> = { ...(previousTopic?.wrongConcepts || {}) };

  input.questions.forEach((question, idx) => {
    if (correctPattern[idx]) return;

    extractConcepts(question.question).forEach((concept) => {
      updatedWrongConcepts[concept] = (updatedWrongConcepts[concept] || 0) + 1;
    });
  });

  const updatedTopic: TopicPerformanceRecord = {
    displayTopic: topicLabel,
    attempts: (previousTopic?.attempts || 0) + 1,
    correctAnswers: (previousTopic?.correctAnswers || 0) + score,
    totalQuestions: (previousTopic?.totalQuestions || 0) + total,
    wrongConcepts: updatedWrongConcepts,
    recentAccuracies: [...(previousTopic?.recentAccuracies || []), accuracy].slice(-12),
    lastAttemptAt: completedAt,
  };

  const attempts = [
    ...store.attempts,
    {
      topic: topicLabel,
      topicKey,
      score,
      total,
      accuracy,
      completedAt,
      correctPattern,
    },
  ].slice(-180);

  const today = utcDateKey(completedAt);
  const lastDay = store.streaks.lastAttemptDate;

  let dailyStreak = store.streaks.daily;
  if (lastDay === today) {
    dailyStreak = Math.max(1, dailyStreak);
  } else if (lastDay === previousUtcDateKey(today)) {
    dailyStreak = Math.max(1, dailyStreak) + 1;
  } else {
    dailyStreak = 1;
  }

  const completionStreak = accuracy >= 60 ? store.streaks.completion + 1 : 0;

  let runningCorrectStreak = store.streaks.correctAnswer;
  let bestCorrectStreak = store.streaks.bestCorrectAnswer;
  correctPattern.forEach((isCorrect) => {
    runningCorrectStreak = isCorrect ? runningCorrectStreak + 1 : 0;
    if (runningCorrectStreak > bestCorrectStreak) {
      bestCorrectStreak = runningCorrectStreak;
    }
  });

  return {
    ...store,
    updatedAt: completedAt,
    attempts,
    topics: {
      ...store.topics,
      [topicKey]: updatedTopic,
    },
    streaks: {
      daily: dailyStreak,
      completion: completionStreak,
      correctAnswer: runningCorrectStreak,
      bestCorrectAnswer: bestCorrectStreak,
      lastAttemptDate: today,
    },
  };
}

export function getAdaptiveInsights(store: QuizAdaptiveStore, currentTopic?: string): AdaptiveInsights {
  const summaries = getAllTopicSummaries(store);
  const weakTopics = summaries
    .filter((topic) => topic.attempts >= 1 && topic.accuracy < 65)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  const strongTopics = summaries
    .filter((topic) => topic.attempts >= 1 && topic.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 4);

  const currentTopicKey = currentTopic ? normalizeTopicKey(currentTopic) : null;
  const currentTopicSummary = currentTopicKey ? summaries.find((summary) => normalizeTopicKey(summary.topic) === currentTopicKey) : null;

  const overallAccuracy = computeOverallAccuracy(store);
  const referenceAccuracy = currentTopicSummary ? currentTopicSummary.accuracy : overallAccuracy;
  const targetDifficulty = computeTargetDifficulty(referenceAccuracy);

  const conceptSource = currentTopicSummary
    ? Object.entries(store.topics[normalizeTopicKey(currentTopicSummary.topic)]?.wrongConcepts || {})
    : Object.values(store.topics)
        .flatMap((topic) => Object.entries(topic.wrongConcepts))
        .reduce<Record<string, number>>((acc, [concept, count]) => {
          acc[concept] = (acc[concept] || 0) + count;
          return acc;
        }, {});

  const focusConcepts = Array.isArray(conceptSource)
    ? conceptSource.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([concept]) => concept)
    : Object.entries(conceptSource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([concept]) => concept);

  const recommendations: string[] = [];

  if (weakTopics[0]) {
    recommendations.push(`You should focus on ${weakTopics[0].topic} today.`);
  }

  if (currentTopicSummary) {
    const improvement = getTopicImprovement(store, normalizeTopicKey(currentTopicSummary.topic));
    if (typeof improvement === "number" && Math.abs(improvement) >= 5) {
      if (improvement > 0) {
        recommendations.push(`You improved ${Math.round(improvement)}% in ${currentTopicSummary.topic}.`);
      } else {
        recommendations.push(`Your ${currentTopicSummary.topic} score dropped ${Math.round(Math.abs(improvement))}% - revise core concepts now.`);
      }
    }
  }

  if (store.streaks.daily >= 3) {
    recommendations.push(`Great consistency: ${store.streaks.daily}-day learning streak.`);
  }

  if (focusConcepts[0]) {
    recommendations.push(`Review this concept next: ${focusConcepts[0]}.`);
  }

  if (targetDifficulty === "hard") {
    recommendations.push("Accuracy is high - moving you toward harder challenge questions.");
  } else if (targetDifficulty === "easy") {
    recommendations.push("We'll prioritize easier reinforcement until your fundamentals recover.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Complete one quiz to unlock adaptive recommendations.");
  }

  return {
    totalAttempts: store.attempts.length,
    overallAccuracy,
    targetDifficulty,
    weakTopics,
    strongTopics,
    focusConcepts,
    recommendations: recommendations.slice(0, 4),
    streaks: store.streaks,
  };
}

export function toAdaptiveRequestContext(insights: AdaptiveInsights) {
  return {
    weakTopics: insights.weakTopics.map((topic) => ({
      topic: topic.topic,
      accuracy: topic.accuracy,
      attempts: topic.attempts,
    })),
    strongTopics: insights.strongTopics.map((topic) => ({
      topic: topic.topic,
      accuracy: topic.accuracy,
      attempts: topic.attempts,
    })),
    focusConcepts: insights.focusConcepts,
    targetDifficulty: insights.targetDifficulty,
  };
}
