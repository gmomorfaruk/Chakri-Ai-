type CoachMode = "hr" | "technical" | "behavioral";

type CoachTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CoachReplyRequest = {
  mode: CoachMode;
  message: string;
  history?: CoachTurn[];
  assistantType?: "interview" | "learning";
  focus?: string;
};

const AI_HTTP_TIMEOUT_MS = Number(process.env.AI_HTTP_TIMEOUT_MS || "20000");

function nextInterviewQuestion(mode: CoachMode) {
  if (mode === "technical") {
    return "Explain a challenging bug you fixed recently and how you diagnosed it.";
  }

  if (mode === "behavioral") {
    return "Tell me about a time you handled conflict within your team.";
  }

  return "Tell me about a time you delivered results under a tight deadline.";
}

function interviewQuestionBank(mode: CoachMode) {
  if (mode === "technical") {
    return [
      "Explain a challenging bug you fixed recently and how you diagnosed it.",
      "Describe a system you designed to handle increased traffic. What trade-offs did you make?",
      "Tell me about a time you improved performance of a slow API or query.",
      "How would you debug intermittent production errors with limited logs?",
    ];
  }

  if (mode === "behavioral") {
    return [
      "Tell me about a time you handled conflict within your team.",
      "Describe a situation where you had to influence someone without formal authority.",
      "Tell me about a time you received tough feedback and how you handled it.",
      "Share an example of leading a project under uncertainty.",
    ];
  }

  return [
    "Tell me about a time you delivered results under a tight deadline.",
    "Why do you want to work with our company?",
    "Tell me about a time you made a mistake at work and what you learned.",
    "How do you prioritize when multiple urgent tasks arrive at the same time?",
  ];
}

function extractQuestionFromText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^next:?\s*/i, "").trim())
    .filter((line) => line.endsWith("?") && line.length >= 12);

  if (lines.length > 0) return lines[0];

  const sentence = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .find((part) => part.endsWith("?") && part.length >= 12);

  return sentence || null;
}

function pickNextInterviewQuestion(mode: CoachMode, history: CoachTurn[] = [], preferred?: string | null) {
  const recentAssistantText = history
    .filter((turn) => turn.role === "assistant")
    .slice(-6)
    .map((turn) => turn.content.toLowerCase())
    .join("\n");

  const options = [preferred || "", ...interviewQuestionBank(mode), nextInterviewQuestion(mode)]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

  const fresh = options.find((question) => !recentAssistantText.includes(question.toLowerCase()));
  return fresh || options[0] || nextInterviewQuestion(mode);
}

function isShortOrNonAnswerMessage(message: string) {
  const value = message.trim().toLowerCase();
  if (!value) return true;

  const compact = value.replace(/[.!?,]/g, "").trim();
  const lightweight = new Set([
    "hi",
    "hello",
    "hey",
    "ok",
    "okay",
    "yo",
    "yes",
    "no",
    "hmm",
    "hmmm",
    "thanks",
    "thank you",
    "start",
    "go",
    "continue",
    "next",
  ]);

  if (lightweight.has(compact)) return true;

  const words = compact.split(/\s+/).filter(Boolean);
  return words.length <= 3;
}

function isQuestionRequestMessage(message: string) {
  const value = message.trim().toLowerCase();
  if (!value) return false;

  const compact = value.replace(/\s+/g, " ");
  const shortEnough = compact.split(" ").filter(Boolean).length <= 14;

  if (!shortEnough) return false;

  if (/^(can you|could you|would you|please|pls)?\s*(ask|give|send|share|provide)\b.*\b(question|interview question)\b/.test(compact)) {
    return true;
  }

  if (/^(next|another)\s+question\b/.test(compact)) {
    return true;
  }

  if (/\bask me\b.*\b(question|interview question)\b/.test(compact)) {
    return true;
  }

  return false;
}

function firstMeaningfulSentence(text: string, fallback: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (!sentence) return fallback;

  return sentence.length > 110 ? `${sentence.slice(0, 107).trimEnd()}...` : sentence;
}

function extractBulletCandidates(text: string) {
  const lineCandidates = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 12 && !/^feedback:?/i.test(line) && !/^next:?/i.test(line) && !/^improve:?/i.test(line));

  const sentenceCandidates = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12 && !/^feedback:?/i.test(part) && !/^next:?/i.test(part) && !/^improve:?/i.test(part));

  const seen = new Set<string>();
  const deduped = [...lineCandidates, ...sentenceCandidates].filter((candidate) => {
    const key = candidate.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

function defaultImprovePoints(mode: CoachMode) {
  if (mode === "technical") {
    return [
      "State the root cause clearly before describing the fix.",
      "Quantify impact (latency, errors, throughput, or reliability).",
    ];
  }

  if (mode === "behavioral") {
    return [
      "Use STAR and highlight your direct ownership.",
      "End with measurable results and team impact.",
    ];
  }

  return [
    "Use STAR and keep the timeline concise.",
    "Include one measurable outcome to prove impact.",
  ];
}

function enforceInterviewFormat(raw: string, mode: CoachMode, userMessage: string, history: CoachTurn[] = []) {
  if (isShortOrNonAnswerMessage(userMessage) || isQuestionRequestMessage(userMessage)) {
    return pickNextInterviewQuestion(mode, history, extractQuestionFromText(raw));
  }

  const feedback = firstMeaningfulSentence(raw, "Good answer with clear intent, but it needs sharper impact evidence.")
    .replace(/^(feedback:?\s*)+/i, "")
    .trim();
  const candidates = extractBulletCandidates(raw);
  const fallbacks = defaultImprovePoints(mode);

  const pointOne = (candidates[0] || fallbacks[0]).slice(0, 95).trim();
  const pointTwo = (candidates[1] || fallbacks[1]).slice(0, 95).trim();

  let nextLine = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^next:?/i.test(line) || line.endsWith("?"));

  if (!nextLine) {
    nextLine = pickNextInterviewQuestion(mode, history, extractQuestionFromText(raw));
  }

  nextLine = nextLine.replace(/^next:?\s*/i, "").trim();
  if (!nextLine.endsWith("?")) {
    nextLine = pickNextInterviewQuestion(mode, history, extractQuestionFromText(raw));
  }

  return [
    `Feedback: ${feedback}`,
    "Improve:",
    `- ${pointOne}`,
    `- ${pointTwo}`,
    `Next: ${nextLine}`,
  ].join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = AI_HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`AI provider request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function systemPrompt(mode: CoachMode, assistantType: "interview" | "learning" = "interview", focus?: string) {
  if (assistantType === "learning") {
    const focusLine = focus ? `Primary focus area: ${focus}.` : "";
    return [
      "You are Chakri AI Learning Coach for Bangladesh job seekers.",
      "Teach clearly in practical steps and answer normal career questions beyond interview practice.",
      "Prioritize Bangladesh market context: private jobs, government jobs, banks, NGOs, remote/global roles from Bangladesh, and common local hiring expectations.",
      "When useful, provide skill roadmap, CV tips, interview prep, salary expectation framing, and reliable next-step actions.",
      "Keep responses concise but useful, with bullet-style structure when listing actions.",
      focusLine,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const strictFormat = [
    "Keep responses short: maximum 3-5 lines.",
    "Be direct, professional, and interview-focused.",
    "Never explain your behavior or repeat instructions.",
    "If user message is short/non-answer (hi, hello, ok, yes, no, thanks), ask ONE interview question only and do not give feedback.",
    "If user gives an interview answer, respond exactly in this 5-line format:",
    "Feedback: one concise line.",
    "Improve:",
    "- point 1",
    "- point 2",
    "Next: one realistic interview question",
    "If output is longer than 5 lines, shorten it automatically.",
  ].join(" ");

  if (mode === "technical") {
    return `You are Chakri AI Technical Coach. Ask technical interview questions and evaluate practical reasoning. ${strictFormat}`;
  }
  if (mode === "behavioral") {
    return `You are Chakri AI Behavioral Coach. Focus on communication, teamwork, leadership, and situation-based interview practice. ${strictFormat}`;
  }
  return `You are Chakri AI HR Coach. Conduct HR-style interview practice with supportive, professional guidance. ${strictFormat}`;
}

async function geminiReply(input: CoachReplyRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt(input.mode, input.assistantType, input.focus) }],
        },
        generationConfig: {
          temperature: 0.5,
        },
        contents: [
          ...(input.history ?? []).slice(-8).map((turn) => ({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          })),
          {
            role: "user",
            parts: [{ text: input.message }],
          },
        ],
      }),
    },
    AI_HTTP_TIMEOUT_MS
  );

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
  return text || null;
}

async function openAiReply(input: CoachReplyRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt(input.mode, input.assistantType, input.focus) },
        ...(input.history ?? []).slice(-8),
        { role: "user", content: input.message },
      ],
    }),
  }, AI_HTTP_TIMEOUT_MS);

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function huggingFaceReply(input: CoachReplyRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.HUGGINGFACE_MODEL || "Qwen/Qwen2.5-7B-Instruct";

  const response = await fetchWithTimeout("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt(input.mode, input.assistantType, input.focus) },
        ...(input.history ?? []).slice(-8),
        { role: "user", content: input.message },
      ],
    }),
  }, AI_HTTP_TIMEOUT_MS);

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Hugging Face request failed (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function mockReply(input: CoachReplyRequest) {
  const contextHint =
    input.mode === "technical"
      ? "Mention architecture choices, trade-offs, and testing strategy."
      : input.mode === "behavioral"
      ? "Use one real scenario to show communication and ownership."
      : "Use STAR format and include a measurable outcome.";

  return enforceInterviewFormat(
    `Feedback: Good start. ${contextHint}\nImprove:\n- Use STAR clearly.\n- Add one measurable result.\nNext: ${nextInterviewQuestion(input.mode)}`,
    input.mode,
    input.message,
    input.history ?? []
  );
}

export async function generateCoachReply(input: CoachReplyRequest) {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (provider === "gemini") {
    const gemini = await geminiReply(input);
    if (gemini) {
      const reply = input.assistantType === "learning" ? gemini : enforceInterviewFormat(gemini, input.mode, input.message, input.history ?? []);
      return { reply, provider: "gemini" as const };
    }
  }

  if (provider === "openai") {
    const openAi = await openAiReply(input);
    if (openAi) {
      const reply = input.assistantType === "learning" ? openAi : enforceInterviewFormat(openAi, input.mode, input.message, input.history ?? []);
      return { reply, provider: "openai" as const };
    }
  }

  if (provider === "huggingface") {
    const huggingFace = await huggingFaceReply(input);
    if (huggingFace) {
      const reply = input.assistantType === "learning" ? huggingFace : enforceInterviewFormat(huggingFace, input.mode, input.message, input.history ?? []);
      return { reply, provider: "huggingface" as const };
    }
  }

  return { reply: mockReply(input), provider: "mock" as const };
}
