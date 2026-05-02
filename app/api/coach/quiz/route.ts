import { NextResponse } from "next/server";
import { generateCoachReply } from "@/lib/aiCoachProvider";

type QuizRequestBody = {
  topic?: string;
  sourceText?: string;
  questionCount?: number;
  difficulty?: "easy" | "medium" | "hard" | "adaptive";
  researchMode?: "auto" | "web" | "off";
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
  sources?: ResearchSource[];
};

type ResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

type QuizIntent = {
  kind: "bcs" | "networking" | "current_affairs" | "technical" | "general";
  label: string;
  shouldResearch: boolean;
};

const RESEARCH_TIMEOUT_MS = Number(process.env.QUIZ_RESEARCH_TIMEOUT_MS || "4500");
const MAX_RESEARCH_SOURCES = 5;

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

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function clampSnippet(value: string, maxLength = 900) {
  const cleaned = cleanText(value);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength).trimEnd()}...` : cleaned;
}

function classifyQuizIntent(topic: string, sourceText: string): QuizIntent {
  const value = `${topic} ${sourceText.slice(0, 500)}`.toLowerCase();

  if (/\b(bcs|bangladesh civil service|preliminary|preli|psc)\b/.test(value)) {
    return { kind: "bcs", label: "BCS Preliminary", shouldResearch: true };
  }

  if (/\b(current affairs|recent|latest|today|this week|this month|news|2025|2026)\b/.test(value)) {
    return { kind: "current_affairs", label: "Current Affairs", shouldResearch: true };
  }

  if (/\b(networking|computer network|osi|tcp|udp|ip address|subnet|dns|routing|switching|firewall)\b/.test(value)) {
    return { kind: "networking", label: "Computer Networking", shouldResearch: true };
  }

  if (/\b(react|next\.?js|javascript|typescript|python|java|sql|database|operating system|docker|cloud|devops|api|algorithm|data structure)\b/.test(value)) {
    return { kind: "technical", label: "Technical Practice", shouldResearch: true };
  }

  return { kind: "general", label: "General Practice", shouldResearch: topic.trim().length > 0 };
}

function intentGuidance(intent: QuizIntent) {
  if (intent.kind === "bcs") {
    return [
      "Exam style: Bangladesh Civil Service (BCS) preliminary MCQ.",
      "Use concise fact-based questions with one unambiguous answer.",
      "Prefer Bangladesh affairs, international affairs, Bangla, English, math, mental ability, general science, ICT, geography, ethics, and governance when relevant.",
      "Keep options realistic and similar in length.",
    ].join("\n");
  }

  if (intent.kind === "networking") {
    return [
      "Domain style: computer networking MCQ.",
      "Cover OSI/TCP-IP layers, DNS, HTTP/HTTPS, IP addressing, subnetting, routing, switching, ports, firewalls, latency, bandwidth, and troubleshooting when relevant.",
      "Include conceptual and applied scenario questions, not only definitions.",
    ].join("\n");
  }

  if (intent.kind === "current_affairs") {
    return [
      "Exam style: current affairs MCQ.",
      "Use the research context carefully and avoid unsupported claims.",
      "Every fact-based question must be answerable from the provided research/source context.",
    ].join("\n");
  }

  if (intent.kind === "technical") {
    return [
      "Domain style: practical technical MCQ.",
      "Mix definitions, debugging, scenario analysis, best practices, and applied reasoning.",
      "Avoid trivia unless it is commonly tested in interviews or exams.",
    ].join("\n");
  }

  return [
    "Domain style: general exam MCQ.",
    "Prefer practical understanding, core concepts, and commonly tested knowledge.",
  ].join("\n");
}

function fallbackConceptsForIntent(intent: QuizIntent, topic: string) {
  if (intent.kind === "bcs") {
    return [
      "Bangladesh Constitution",
      "Liberation War history",
      "Bangladesh geography",
      "international organizations",
      "basic arithmetic",
      "English grammar",
      "Bangla literature",
      "ICT fundamentals",
      "general science",
      "mental ability",
    ];
  }

  if (intent.kind === "networking") {
    return ["OSI model", "TCP vs UDP", "DNS", "IP addressing", "subnet mask", "routing", "switching", "HTTP status codes", "firewalls", "latency"];
  }

  if (intent.kind === "technical") {
    return ["core concept", "best practice", "debugging", "performance", "security", "data flow", "edge case", "trade-off"];
  }

  return extractKeywords(topic).length ? extractKeywords(topic) : ["core concept", "definition", "application", "comparison", "example"];
}

function builtInContextForIntent(intent: QuizIntent, topic: string) {
  if (intent.kind === "bcs") {
    return [
      "Built-in BCS preliminary preparation context:",
      "BCS preliminary MCQs commonly cover Bangla language and literature, English language and literature, Bangladesh affairs, international affairs, geography, environment, disaster management, general science, computer and ICT, mathematical reasoning, mental ability, ethics, values, and good governance.",
      "Bangladesh affairs questions often test the Liberation War, Constitution, national symbols, geography, economy, government institutions, historical dates, and development indicators.",
      "International affairs questions often test major organizations, global geography, diplomacy, international days, treaties, and current global events.",
      `Requested BCS focus: ${topic || "general BCS preliminary practice"}.`,
    ].join("\n");
  }

  if (intent.kind === "networking") {
    return [
      "Built-in computer networking context:",
      "Core networking topics include OSI and TCP/IP models, IP addressing, subnet masks, default gateways, DNS, DHCP, ARP, routing, switching, VLANs, NAT, firewalls, VPNs, TCP versus UDP, common ports, HTTP/HTTPS, latency, bandwidth, packet loss, and troubleshooting tools such as ping, traceroute, nslookup, and netstat.",
      "Good networking MCQs should test layer responsibilities, protocol behavior, address calculations, failure diagnosis, and practical network design trade-offs.",
      `Requested networking focus: ${topic || "networking fundamentals"}.`,
    ].join("\n");
  }

  if (intent.kind === "technical") {
    return [
      "Built-in technical quiz context:",
      "Technical MCQs should mix conceptual understanding, applied scenarios, debugging, best practices, performance, security, and trade-off reasoning.",
      `Requested technical focus: ${topic || "technical practice"}.`,
    ].join("\n");
  }

  return "";
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = RESEARCH_TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChakriAIQuizResearch/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDuckDuckGoInstantAnswer(query: string): Promise<ResearchSource[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const data = await fetchJsonWithTimeout<{
    Heading?: string;
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
  }>(url);

  if (!data) return [];

  const sources: ResearchSource[] = [];
  if (data.AbstractText && data.AbstractURL) {
    sources.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: clampSnippet(data.AbstractText),
    });
  }

  for (const item of data.RelatedTopics || []) {
    const nested = Array.isArray(item.Topics) ? item.Topics : [item];
    for (const topicItem of nested) {
      if (!topicItem.Text || !topicItem.FirstURL) continue;
      sources.push({
        title: item.Name || data.Heading || query,
        url: topicItem.FirstURL,
        snippet: clampSnippet(topicItem.Text, 500),
      });
      if (sources.length >= 3) return sources;
    }
  }

  return sources;
}

async function fetchWikipediaSources(query: string): Promise<ResearchSource[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const search = await fetchJsonWithTimeout<{ query?: { search?: Array<{ title?: string; snippet?: string }> } }>(searchUrl);
  const titles = (search?.query?.search || [])
    .map((item) => item.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 3);

  const sources: ResearchSource[] = [];
  for (const title of titles) {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summary = await fetchJsonWithTimeout<{ title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } }>(summaryUrl);
    if (!summary?.extract) continue;
    sources.push({
      title: summary.title || title,
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
      snippet: clampSnippet(summary.extract),
    });
  }

  return sources;
}

async function buildResearchContext(topic: string, intent: QuizIntent, requestedMode: QuizRequestBody["researchMode"]) {
  if (requestedMode === "off") {
    return { sourceText: "", sources: [] as ResearchSource[] };
  }

  if (requestedMode !== "web" && !intent.shouldResearch) {
    return { sourceText: "", sources: [] as ResearchSource[] };
  }

  const query =
    intent.kind === "bcs"
      ? `${topic || "BCS preliminary Bangladesh general knowledge"} exam syllabus facts`
      : intent.kind === "networking"
        ? `${topic || "computer networking"} concepts tutorial`
        : topic;

  const settled = await Promise.allSettled([fetchDuckDuckGoInstantAnswer(query), fetchWikipediaSources(query)]);
  const sources = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((source) => source.snippet.length > 0);

  const uniqueSources = Array.from(new Map(sources.map((source) => [source.url, source])).values()).slice(0, MAX_RESEARCH_SOURCES);
  const sourceText = uniqueSources
    .map((source, index) => `Source ${index + 1}: ${source.title}\nURL: ${source.url}\n${source.snippet}`)
    .join("\n\n");

  return { sourceText, sources: uniqueSources };
}

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

function fallbackQuiz(topic: string, sourceText: string, questionCount: number, intent: QuizIntent, sources: ResearchSource[] = []): QuizPayload {
  const fallbackTopic = topic || "Custom Subject";
  const sourceSentences = splitSourceSentences(sourceText);
  const keywords = extractKeywords(sourceText.length > 0 ? sourceText : topic);
  const concepts = keywords.length ? keywords : fallbackConceptsForIntent(intent, fallbackTopic);

  const questions: QuizQuestion[] = [];

  for (let i = 0; i < questionCount; i += 1) {
    const sentence = sourceSentences[i % Math.max(sourceSentences.length, 1)] || "This topic requires concept review and applied understanding.";
    const keyword = concepts[i % Math.max(concepts.length, 1)] || fallbackTopic;
    const questionText = (() => {
      if (sourceSentences.length > 0) {
        return `Based on the available source context, which statement is most accurate about ${keyword}?`;
      }

      if (intent.kind === "bcs") {
        return `In a BCS preliminary style quiz, which option best matches the topic "${keyword}"?`;
      }

      if (intent.kind === "networking") {
        return `Which statement best describes ${keyword} in computer networking?`;
      }

      return `Which statement best reflects effective understanding of ${keyword} for practice set ${i + 1}?`;
    })();

    const options =
      intent.kind === "networking" && sourceSentences.length === 0
        ? [
            `${keyword} should be understood through its role in data communication and troubleshooting.`,
            `${keyword} is unrelated to network communication.`,
            `${keyword} can be mastered only by memorizing a single definition.`,
            `${keyword} never appears in real network diagnostics.`,
          ]
        : intent.kind === "bcs" && sourceSentences.length === 0
          ? [
              `${keyword} is a commonly tested knowledge area that requires precise factual understanding.`,
              `${keyword} is never relevant to competitive examination preparation.`,
              `${keyword} should be answered only by guessing similar-looking options.`,
              `${keyword} has no connection to general knowledge or reasoning practice.`,
            ]
          : [
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
    title: `${intent.label}: ${fallbackTopic}`,
    topic: fallbackTopic,
    questions,
    sources,
  };
}

function buildQuizPrompt(
  topic: string,
  sourceText: string,
  questionCount: number,
  difficulty: "easy" | "medium" | "hard" | "adaptive",
  excludeQuestionHashes: string[],
  intent: QuizIntent,
  researchSources: ResearchSource[],
  adaptiveContext?: QuizRequestBody["adaptiveContext"]
) {
  const hasSource = sourceText.trim().length > 0;
  const modeLine = hasSource
    ? "Mode: Source-grounded generation. Use the provided source/research content for fact-based questions. You may use stable background knowledge only for non-current conceptual questions."
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

  const sourceListBlock = researchSources.length
    ? [
        "Research source links used:",
        ...researchSources.map((source, index) => `${index + 1}. ${source.title} - ${source.url}`),
        "For any current or fact-heavy question, base the correct answer on these sources.",
      ].join("\n")
    : "Research source links used: none.";

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
    "QUIZ INTENT:",
    `Detected style: ${intent.label}.`,
    intentGuidance(intent),
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
    "",
    "SOURCES:",
    sourceListBlock,
    "",
    `Requested topic: ${topic || "Derived from provided content"}`,
    contentBlock,
  ].join("\n");
}

function ensureQuestionCount(
  quiz: QuizPayload,
  topic: string,
  sourceText: string,
  questionCount: number,
  excludedHashes: Set<string>,
  intent: QuizIntent,
  sources: ResearchSource[]
) {
  if (quiz.questions.length >= questionCount) {
    return {
      ...quiz,
      questions: quiz.questions.slice(0, questionCount),
      sources: quiz.sources?.length ? quiz.sources : sources,
    };
  }

  const extra = fallbackQuiz(topic, sourceText, questionCount + 6, intent, sources).questions;
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
    sources: quiz.sources?.length ? quiz.sources : sources,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuizRequestBody;
    const topic = (body.topic || "").trim();
    const sourceText = (body.sourceText || "").trim();
    const questionCount = Math.max(3, Math.min(100, Math.floor(body.questionCount ?? 8)));
    const difficulty = body.difficulty || "adaptive";
    const researchMode = body.researchMode || "auto";
    const excludedHashes = new Set((body.excludeQuestionHashes || []).filter((item): item is string => typeof item === "string" && item.trim().length > 0));
    const adaptiveContext = body.adaptiveContext;

    if (!topic && !sourceText) {
      return NextResponse.json({ error: "Topic or source content is required." }, { status: 400 });
    }

    const intent = classifyQuizIntent(topic, sourceText);
    const research = sourceText
      ? { sourceText: "", sources: [] as ResearchSource[] }
      : await buildResearchContext(topic, intent, researchMode);
    const builtInContext = builtInContextForIntent(intent, topic);
    const enrichedSourceText = [sourceText, builtInContext, research.sourceText].filter(Boolean).join("\n\n");

    const prompt = buildQuizPrompt(
      topic,
      enrichedSourceText,
      questionCount,
      difficulty,
      Array.from(excludedHashes),
      intent,
      research.sources,
      adaptiveContext
    );
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
      if (parsed) {
        parsed = {
          ...parsed,
          sources: research.sources,
        };
      }
    } catch {
      parsed = null;
    }

    const quizBase = parsed ?? fallbackQuiz(topic, enrichedSourceText, questionCount, intent, research.sources);
    const filteredBase = {
      ...quizBase,
      questions: quizBase.questions.filter((question) => !excludedHashes.has(question.hash)),
    };
    const quiz = ensureQuestionCount(filteredBase, topic, enrichedSourceText, questionCount, excludedHashes, intent, research.sources);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
