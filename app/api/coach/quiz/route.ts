import { NextResponse } from "next/server";
import { generateCoachReply } from "@/lib/aiCoachProvider";

type QuizRequestBody = {
  topic?: string;
  sourceText?: string;
  questionCount?: number;
  difficulty?: "easy" | "medium" | "hard" | "adaptive";
  excludeQuestionHashes?: string[];
  adaptiveContext?: {
    weakTopics?: Array<{ topic?: string; accuracy?: number; attempts?: number }>;
    strongTopics?: Array<{ topic?: string; accuracy?: number; attempts?: number }>;
    focusConcepts?: string[];
    targetDifficulty?: "easy" | "medium" | "hard";
  };
};

type ModelOptionMap = {
  A?: unknown;
  B?: unknown;
  C?: unknown;
  D?: unknown;
};

type ModelQuestion = {
  question?: unknown;
  options?: unknown;
  correct_answer?: unknown;
  explanation?: unknown;
  // Backward-compatible fields in case model deviates
  correctIndex?: unknown;
  answerIndex?: unknown;
};

type ModelQuizPayload = {
  quiz_title?: unknown;
  topic?: unknown;
  questions?: unknown;
  // Backward-compatible title field
  title?: unknown;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hash: string;
};

type QuizPayload = {
  title: string;
  topic: string;
  questions: QuizQuestion[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "your",
  "into",
  "are",
  "was",
  "were",
  "will",
  "can",
  "could",
  "should",
  "would",
  "about",
  "when",
  "where",
  "which",
  "what",
  "how",
  "their",
  "there",
]);

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function getQuestionSignature(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashQuestionSignature(signature: string) {
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i += 1) {
    hash ^= signature.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeOptions(optionsRaw: unknown) {
  // Preferred strict format: { A: "...", B: "...", C: "...", D: "..." }
  if (optionsRaw && typeof optionsRaw === "object" && !Array.isArray(optionsRaw)) {
    const options = optionsRaw as ModelOptionMap;
    const a = typeof options.A === "string" ? options.A.trim() : "";
    const b = typeof options.B === "string" ? options.B.trim() : "";
    const c = typeof options.C === "string" ? options.C.trim() : "";
    const d = typeof options.D === "string" ? options.D.trim() : "";
    const mapped = [a, b, c, d];

    if (mapped.every(Boolean)) {
      return mapped;
    }
  }

  // Fallback compatibility if model returns array
  if (Array.isArray(optionsRaw)) {
    const mapped = optionsRaw
      .slice(0, 4)
      .map((opt) => (typeof opt === "string" ? opt.trim() : ""));
    if (mapped.length === 4 && mapped.every(Boolean)) {
      return mapped;
    }
  }

  return null;
}

function normalizeCorrectIndex(question: ModelQuestion, optionsLength: number) {
  if (typeof question.correct_answer === "string") {
    const letter = question.correct_answer.trim().toUpperCase();
    const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    if (letter in letterMap && letterMap[letter] < optionsLength) {
      return letterMap[letter];
    }
  }

  // Fallback compatibility
  const maybeIndex =
    typeof question.correctIndex === "number"
      ? question.correctIndex
      : typeof question.answerIndex === "number"
        ? question.answerIndex
        : -1;

  if (Number.isInteger(maybeIndex) && maybeIndex >= 0 && maybeIndex < optionsLength) {
    return maybeIndex;
  }

  return -1;
}

function normalizeQuizPayload(
  raw: unknown,
  fallbackTopic: string,
  questionCount: number,
  excludedHashes: Set<string>
): QuizPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as ModelQuizPayload;

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return null;
  }

  const seen = new Set<string>();

  const normalizedQuestions: QuizQuestion[] = data.questions
    .map((item, idx) => {
      if (!item || typeof item !== "object") return null;

      const q = item as ModelQuestion;

      const question = typeof q.question === "string" ? q.question.trim() : "";
      const signature = getQuestionSignature(question);
      const hash = hashQuestionSignature(signature);
      if (!question || !signature || seen.has(signature) || excludedHashes.has(hash)) {
        return null;
      }

      const options = normalizeOptions(q.options);
      if (!options) {
        return null;
      }

      const correctIndex = normalizeCorrectIndex(q, options.length);

      if (correctIndex < 0 || correctIndex >= options.length) {
        return null;
      }

      seen.add(signature);

      return {
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `q-${idx + 1}`,
        question,
        options,
        correctIndex,
        explanation:
          typeof q.explanation === "string" && q.explanation.trim()
            ? q.explanation.trim()
            : "Review the concept and compare each option carefully.",
        hash,
      };
    })
    .filter((item): item is QuizQuestion => Boolean(item))
    .slice(0, questionCount);

  if (normalizedQuestions.length === 0) {
    return null;
  }

  return {
    title:
      typeof data.quiz_title === "string" && data.quiz_title.trim()
        ? data.quiz_title.trim()
        : typeof data.title === "string" && data.title.trim()
          ? data.title.trim()
        : `MCQ Practice: ${fallbackTopic || "Custom Subject"}`,
    topic:
      typeof data.topic === "string" && data.topic.trim()
        ? data.topic.trim()
        : fallbackTopic,
    questions: normalizedQuestions,
  };
}

function splitSourceSentences(sourceText: string) {
  return sourceText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25);
}

function extractKeywords(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  return Array.from(new Set(words)).slice(0, 20);
}

function fallbackQuiz(topic: string, sourceText: string, questionCount: number): QuizPayload {
  const fallbackTopic = topic || "Custom Subject";
  const sourceSentences = splitSourceSentences(sourceText);
  const keywords = extractKeywords(sourceText.length > 0 ? sourceText : topic);

  const questions: QuizQuestion[] = [];

  for (let i = 0; i < questionCount; i += 1) {
    const sentence = sourceSentences[i % Math.max(sourceSentences.length, 1)] || "This topic requires concept review and applied understanding.";
    const keyword = keywords[i % Math.max(keywords.length, 1)] || fallbackTopic;
    const questionText =
      sourceSentences.length > 0
        ? `Based on the provided content, which statement is most accurate for ${keyword} in scenario ${i + 1}?`
        : `Which statement best reflects effective understanding of ${keyword} for practice set ${i + 1}?`;

    const options = [
      `The key point is: ${sentence.slice(0, 90)}${sentence.length > 90 ? "..." : ""}`,
      `The topic is unrelated to ${keyword}.`,
      `Only memorizing definitions is enough for ${keyword}.`,
      `No practical examples are needed to learn ${keyword}.`,
    ];

    questions.push({
      id: `q-${i + 1}`,
      question: questionText,
      options,
      correctIndex: 0,
      explanation:
        sourceSentences.length > 0
          ? "The correct option reflects the source text context and practical meaning."
          : "Focus on practical understanding rather than memorization-only approaches.",
      hash: hashQuestionSignature(getQuestionSignature(questionText)),
    });
  }

  return {
    title: `MCQ Practice: ${fallbackTopic}`,
    topic: fallbackTopic,
    questions,
  };
}

function buildQuizPrompt(
  topic: string,
  sourceText: string,
  questionCount: number,
  difficulty: "easy" | "medium" | "hard" | "adaptive",
  excludeQuestionHashes: string[],
  adaptiveContext?: QuizRequestBody["adaptiveContext"]
) {
  const hasSource = sourceText.trim().length > 0;
  const modeLine = hasSource
    ? "Mode: Content-based generation. Use ONLY the provided content. Do not add outside assumptions."
    : "Mode: Topic-based generation. Use conceptual and exam-relevant general knowledge.";

  const targetDifficulty = adaptiveContext?.targetDifficulty;
  const effectiveDifficulty = difficulty === "adaptive" ? targetDifficulty || "medium" : difficulty;
  const difficultyPlan =
    effectiveDifficulty === "hard"
      ? `Difficulty mix target: Easy ${Math.max(1, Math.round(questionCount * 0.15))}, Medium ${Math.max(2, Math.round(questionCount * 0.35))}, Hard ${Math.max(1, questionCount - Math.round(questionCount * 0.15) - Math.round(questionCount * 0.35))}.`
      : effectiveDifficulty === "easy"
        ? `Difficulty mix target: Easy ${Math.max(1, Math.round(questionCount * 0.5))}, Medium ${Math.max(2, Math.round(questionCount * 0.35))}, Hard ${Math.max(1, questionCount - Math.round(questionCount * 0.5) - Math.round(questionCount * 0.35))}.`
        : questionCount >= 6
          ? `Difficulty mix target: Easy ${Math.max(1, Math.round(questionCount * 0.3))}, Medium ${Math.max(2, Math.round(questionCount * 0.5))}, Hard ${Math.max(1, questionCount - Math.round(questionCount * 0.3) - Math.round(questionCount * 0.5))}.`
          : "Difficulty mix target: include easy, medium, and hard questions as possible.";

  const weakTopics = (adaptiveContext?.weakTopics ?? [])
    .filter((item) => typeof item.topic === "string" && item.topic.trim().length > 0)
    .slice(0, 4)
    .map((item) => {
      const accuracy = typeof item.accuracy === "number" ? `${Math.round(item.accuracy)}%` : "n/a";
      const attempts = typeof item.attempts === "number" ? `${item.attempts}` : "0";
      return `${item.topic?.trim()} (accuracy: ${accuracy}, attempts: ${attempts})`;
    });

  const strongTopics = (adaptiveContext?.strongTopics ?? [])
    .filter((item) => typeof item.topic === "string" && item.topic.trim().length > 0)
    .slice(0, 3)
    .map((item) => {
      const accuracy = typeof item.accuracy === "number" ? `${Math.round(item.accuracy)}%` : "n/a";
      return `${item.topic?.trim()} (${accuracy})`;
    });

  const focusConcepts = (adaptiveContext?.focusConcepts ?? [])
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, 8);

  const adaptiveLines =
    weakTopics.length || strongTopics.length || focusConcepts.length || targetDifficulty
      ? [
          "Adaptive personalization instructions:",
          weakTopics.length
            ? `- Prioritize weak areas by generating more questions from: ${weakTopics.join(", ")}.`
            : "- No weak topic list provided.",
          strongTopics.length
            ? `- Reduce over-representation of strong topics: ${strongTopics.join(", ")}.`
            : "- No strong topic list provided.",
          focusConcepts.length
            ? `- Focus concepts frequently answered incorrectly: ${focusConcepts.join(", ")}.`
            : "- No specific weak concepts provided.",
          targetDifficulty ? `- Global difficulty preference: ${targetDifficulty}.` : "- Global difficulty preference: balanced.",
          "- Keep all questions relevant to requested topic/content.",
        ].join("\n")
      : "Adaptive personalization instructions: default balanced generation.";

  const contentBlock = hasSource
    ? `Provided content:\n"""\n${sourceText.trim().slice(0, 10000)}\n"""`
    : "No content provided.";

  const duplicateGuardBlock = excludeQuestionHashes.length
    ? [
        "Anti-duplication constraints:",
        "- Never repeat questions matching previously used hash signatures for this topic.",
        `- Excluded question hashes (${excludeQuestionHashes.length}): ${excludeQuestionHashes.slice(0, 50).join(", ")}`,
        "- Ensure all generated questions are distinct from each other and from the excluded hash set.",
      ].join("\n")
    : "Anti-duplication constraints: generate a unique set of questions with no repeats.";

  return [
    "SYSTEM ROLE:",
    "You are an AI quiz-generation engine for premium MCQ practice.",
    "",
    "OBJECTIVE:",
    `Generate exactly ${questionCount} high-quality multiple-choice questions for the user request. Never return fewer than ${questionCount}.`,
    "",
    "MODE:",
    modeLine,
    "",
    "DIFFICULTY PLAN:",
    difficultyPlan,
    "",
    "QUESTION RULES:",
    "- Each question must have exactly 4 options labeled A, B, C, D.",
    "- Exactly one correct answer.",
    "- Avoid ambiguity and trick phrasing.",
    "- Keep language clear, concise, and exam-oriented.",
    "- Explanation must be 1-2 lines only.",
    "",
    "ADAPTIVE PERSONALIZATION:",
    adaptiveLines,
    "",
    "DUPLICATION SAFETY:",
    duplicateGuardBlock,
    "",
    "STRICT OUTPUT:",
    "Return only valid JSON in this exact schema:",
    '{"quiz_title":"string","topic":"string","questions":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correct_answer":"A","explanation":"string"}]}',
    "Do not include markdown, comments, or extra keys.",
    `Requested topic: ${topic || "Derived from provided content"}`,
    contentBlock,
  ].join("\n");
}

function ensureQuestionCount(
  quiz: QuizPayload,
  topic: string,
  sourceText: string,
  questionCount: number,
  excludedHashes: Set<string>
) {
  if (quiz.questions.length >= questionCount) {
    return {
      ...quiz,
      questions: quiz.questions.slice(0, questionCount),
    };
  }

  const extra = fallbackQuiz(topic, sourceText, questionCount + 6).questions;
  const seen = new Set(quiz.questions.map((q) => getQuestionSignature(q.question)));
  const merged = [...quiz.questions];

  for (const candidate of extra) {
    const signature = getQuestionSignature(candidate.question);
    if (!signature || seen.has(signature) || excludedHashes.has(candidate.hash)) continue;
    seen.add(signature);
    merged.push({
      ...candidate,
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `q-${merged.length + 1}`,
    });
    if (merged.length >= questionCount) break;
  }

  return {
    ...quiz,
    questions: merged.slice(0, questionCount),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuizRequestBody;
    const topic = (body.topic || "").trim();
    const sourceText = (body.sourceText || "").trim();
    const questionCount = Math.max(3, Math.min(100, Math.floor(body.questionCount ?? 8)));
    const difficulty = body.difficulty || "adaptive";
    const excludedHashes = new Set((body.excludeQuestionHashes || []).filter((item): item is string => typeof item === "string" && item.trim().length > 0));
    const adaptiveContext = body.adaptiveContext;

    if (!topic && !sourceText) {
      return NextResponse.json({ error: "Topic or source content is required." }, { status: 400 });
    }

    const prompt = buildQuizPrompt(topic, sourceText, questionCount, difficulty, Array.from(excludedHashes), adaptiveContext);
    let parsed: QuizPayload | null = null;

    try {
      const ai = await generateCoachReply({
        mode: "technical",
        message: prompt,
        assistantType: "learning",
      });

      const jsonText = extractJsonObject(ai.reply);
      const raw = JSON.parse(jsonText) as unknown;
      parsed = normalizeQuizPayload(raw, topic, questionCount, excludedHashes);
    } catch {
      parsed = null;
    }

    const quizBase = parsed ?? fallbackQuiz(topic, sourceText, questionCount);
    const filteredBase = {
      ...quizBase,
      questions: quizBase.questions.filter((question) => !excludedHashes.has(question.hash)),
    };
    const quiz = ensureQuestionCount(filteredBase, topic, sourceText, questionCount, excludedHashes);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
