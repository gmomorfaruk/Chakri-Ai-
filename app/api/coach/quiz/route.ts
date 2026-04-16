import { NextResponse } from "next/server";
import { generateCoachReply } from "@/lib/aiCoachProvider";

type QuizRequestBody = {
  topic?: string;
  sourceText?: string;
  questionCount?: number;
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

function normalizeQuizPayload(raw: unknown, fallbackTopic: string, questionCount: number): QuizPayload | null {
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
      if (!question || !signature || seen.has(signature)) {
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
        id: `q-${idx + 1}`,
        question,
        options,
        correctIndex,
        explanation:
          typeof q.explanation === "string" && q.explanation.trim()
            ? q.explanation.trim()
            : "Review the concept and compare each option carefully.",
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

    const options = [
      `The key point is: ${sentence.slice(0, 90)}${sentence.length > 90 ? "..." : ""}`,
      `The topic is unrelated to ${keyword}.`,
      `Only memorizing definitions is enough for ${keyword}.`,
      `No practical examples are needed to learn ${keyword}.`,
    ];

    questions.push({
      id: `q-${i + 1}`,
      question:
        sourceSentences.length > 0
          ? `Based on the provided content, which statement is most accurate for ${keyword}?`
          : `Which statement best reflects effective understanding of ${keyword}?`,
      options,
      correctIndex: 0,
      explanation:
        sourceSentences.length > 0
          ? "The correct option reflects the source text context and practical meaning."
          : "Focus on practical understanding rather than memorization-only approaches.",
    });
  }

  return {
    title: `MCQ Practice: ${fallbackTopic}`,
    topic: fallbackTopic,
    questions,
  };
}

function buildQuizPrompt(topic: string, sourceText: string, questionCount: number) {
  const hasSource = sourceText.trim().length > 0;
  const modeLine = hasSource
    ? "Mode: Content-based generation. Use ONLY the provided content. Do not add outside assumptions."
    : "Mode: Topic-based generation. Use conceptual and exam-relevant general knowledge.";

  const difficultyPlan =
    questionCount >= 6
      ? `Difficulty mix target: Easy ${Math.max(1, Math.round(questionCount * 0.3))}, Medium ${Math.max(2, Math.round(questionCount * 0.5))}, Hard ${Math.max(1, questionCount - Math.round(questionCount * 0.3) - Math.round(questionCount * 0.5))}.`
      : "Difficulty mix target: include easy, medium, and hard questions as possible.";

  const contentBlock = hasSource
    ? `Provided content:\n"""\n${sourceText.trim().slice(0, 10000)}\n"""`
    : "No content provided.";

  return [
    "You are an AI Quiz Generator designed to help students and job seekers prepare for exams.",
    modeLine,
    `Generate exactly ${questionCount} multiple-choice questions. Never return fewer than ${questionCount}.`,
    difficultyPlan,
    "MCQ Rules:",
    "- Each question must have exactly 4 options labeled A, B, C, D.",
    "- Only one correct answer.",
    "- Avoid ambiguous wording.",
    "- Keep language simple and exam-focused.",
    "- Keep explanation to 1-2 lines.",
    "STRICT OUTPUT: Return only valid JSON in this exact schema:",
    '{"quiz_title":"string","topic":"string","questions":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correct_answer":"A","explanation":"string"}]}',
    `Requested topic: ${topic || "Derived from provided content"}`,
    contentBlock,
  ].join("\n");
}

function ensureQuestionCount(quiz: QuizPayload, topic: string, sourceText: string, questionCount: number) {
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
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    merged.push({
      ...candidate,
      id: `q-${merged.length + 1}`,
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
    const questionCount = Math.max(3, Math.min(15, Math.floor(body.questionCount ?? 8)));

    if (!topic && !sourceText) {
      return NextResponse.json({ error: "Topic or source content is required." }, { status: 400 });
    }

    const prompt = buildQuizPrompt(topic, sourceText, questionCount);
    let parsed: QuizPayload | null = null;

    try {
      const ai = await generateCoachReply({
        mode: "technical",
        message: prompt,
        assistantType: "learning",
      });

      const jsonText = extractJsonObject(ai.reply);
      const raw = JSON.parse(jsonText) as unknown;
      parsed = normalizeQuizPayload(raw, topic, questionCount);
    } catch {
      parsed = null;
    }

    const quizBase = parsed ?? fallbackQuiz(topic, sourceText, questionCount);
    const quiz = ensureQuestionCount(quizBase, topic, sourceText, questionCount);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
