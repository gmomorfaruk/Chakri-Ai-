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

  if (mode === "technical") {
    return "You are Chakri AI Technical Coach. Ask technical interview questions, evaluate practical reasoning, and provide concise improvement feedback.";
  }
  if (mode === "behavioral") {
    return "You are Chakri AI Behavioral Coach. Focus on communication, teamwork, leadership, and situation-based interview practice.";
  }
  return "You are Chakri AI HR Coach. Conduct HR-style interview practice with supportive, professional guidance.";
}

async function geminiReply(input: CoachReplyRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const response = await fetch(
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
    }
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });

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

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
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
  });

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

  return `Coach (mock mode): Good start. ${contextHint}`;
}

export async function generateCoachReply(input: CoachReplyRequest) {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (provider === "gemini") {
    const gemini = await geminiReply(input);
    if (gemini) {
      return { reply: gemini, provider: "gemini" as const };
    }
  }

  if (provider === "openai") {
    const openAi = await openAiReply(input);
    if (openAi) {
      return { reply: openAi, provider: "openai" as const };
    }
  }

  if (provider === "huggingface") {
    const huggingFace = await huggingFaceReply(input);
    if (huggingFace) {
      return { reply: huggingFace, provider: "huggingface" as const };
    }
  }

  return { reply: mockReply(input), provider: "mock" as const };
}
