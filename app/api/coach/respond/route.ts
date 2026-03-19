import { NextResponse } from "next/server";
import { generateCoachReply } from "@/lib/aiCoachProvider";

type CoachRequestBody = {
  mode: "hr" | "technical" | "behavioral";
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  assistantType?: "interview" | "learning";
  focus?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CoachRequestBody;
    const mode = body.mode;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const out = await generateCoachReply({
      mode,
      message,
      history: body.history,
      assistantType: body.assistantType,
      focus: body.focus,
    });

    return NextResponse.json({ reply: out.reply, provider: out.provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
