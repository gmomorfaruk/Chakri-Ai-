"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { VoiceVivaPanel } from "@/components/coach/VoiceVivaPanel";
import {
  addCoachEvaluation,
  addCoachMessage,
  createCoachSession,
  generateSessionTitle,
  getCoachMessages,
  getCoachSessions,
  getLatestCoachEvaluation,
  localEvaluateAnswer,
} from "@/lib/coachService";
import { upsertProfile } from "@/lib/profileService";
import { CoachEvaluation, CoachMessage, CoachMode, CoachSession } from "@/types/coach";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";
type LearningMessage = { id: string; role: "user" | "assistant"; content: string };

const learningFocusMap: Record<LearningTopic, string> = {
  general: "General career guidance in Bangladesh",
  it: "IT and software jobs in Bangladesh",
  govt: "Government and BCS jobs in Bangladesh",
  bank: "Bank and financial sector jobs in Bangladesh",
  ngo: "NGO and development sector jobs in Bangladesh",
};

export function AICoachModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"interview" | "learn" | "voice">("interview");

  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<CoachMode>("hr");
  const [input, setInput] = useState("");

  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [evaluation, setEvaluation] = useState<CoachEvaluation | null>(null);

  const [learningTopic, setLearningTopic] = useState<LearningTopic>("general");
  const [learningInput, setLearningInput] = useState("");
  const [learningSubmitting, setLearningSubmitting] = useState(false);
  const [learningMessages, setLearningMessages] = useState<LearningMessage[]>([]);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function init() {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setLoading(false);
      setError(t("profileAuthRequired"));
      return;
    }

    const uid = authData.user.id;

    const { error: profileError } = await upsertProfile(supabase, uid, {
      username: authData.user.email?.split("@")[0] ?? null,
      full_name: authData.user.user_metadata?.full_name ?? null,
      bio: null,
      avatar_url: null,
      theme: "default",
      is_public: false,
    });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    setUserId(uid);

    const sessionsRes = await getCoachSessions(supabase, uid);
    const loadedSessions = sessionsRes.data ?? [];
    setSessions(loadedSessions);

    if (loadedSessions.length > 0) {
      await loadSession(loadedSessions[0].id);
    }

    setLoading(false);
  }

  async function loadSession(sessionId: string) {
    if (!supabase) return;
    setActiveSessionId(sessionId);

    const [messagesRes, evaluationRes] = await Promise.all([
      getCoachMessages(supabase, sessionId),
      getLatestCoachEvaluation(supabase, sessionId),
    ]);

    setMessages(messagesRes.data ?? []);
    setEvaluation(evaluationRes.data ?? null);
  }

  async function ensureSession(prompt: string): Promise<string | null> {
    if (!supabase || !userId) return null;

    if (activeSessionId) {
      return activeSessionId;
    }

    const { data, error: createError } = await createCoachSession(supabase, {
      user_id: userId,
      mode,
      title: generateSessionTitle(mode, prompt),
    });

    if (createError || !data) {
      setError(createError?.message ?? t("coachSessionCreateFailed"));
      return null;
    }

    const updated = [data, ...sessions];
    setSessions(updated);
    setActiveSessionId(data.id);
    return data.id;
  }

  async function onStartSession() {
    const sessionId = await ensureSession(input || mode);
    if (!sessionId) return;
    await loadSession(sessionId);
  }

  async function onSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId || !input.trim()) return;

    setSubmitting(true);
    setError(null);

    const text = input.trim();
    const sessionId = await ensureSession(text);
    if (!sessionId) {
      setSubmitting(false);
      return;
    }

    const { error: userMsgError } = await addCoachMessage(supabase, {
      session_id: sessionId,
      user_id: userId,
      role: "user",
      content: text,
    });

    if (userMsgError) {
      setError(userMsgError.message);
      setSubmitting(false);
      return;
    }

    const history = messages
      .slice(-8)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
      .filter((m) => m.content.trim().length > 0);

    const aiRes = await fetch("/api/coach/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message: text, history }),
    });

    if (!aiRes.ok) {
      const errorPayload = (await aiRes.json().catch(() => null)) as { error?: string } | null;
      setError(errorPayload?.error || t("coachAiFailed"));
      setSubmitting(false);
      await loadSession(sessionId);
      return;
    }

    const aiData = (await aiRes.json()) as { reply?: string };
    const aiReply = aiData.reply?.trim() || t("coachDefaultReply");

    const { error: aiMsgError } = await addCoachMessage(supabase, {
      session_id: sessionId,
      user_id: userId,
      role: "assistant",
      content: aiReply,
    });

    if (aiMsgError) {
      setError(aiMsgError.message);
      setSubmitting(false);
      return;
    }

    const evalPayload = localEvaluateAnswer(text);
    const { error: evalError } = await addCoachEvaluation(supabase, {
      session_id: sessionId,
      user_id: userId,
      ...evalPayload,
    });

    if (evalError) {
      setError(evalError.message);
    }

    setInput("");
    await loadSession(sessionId);
    setSubmitting(false);
  }

  async function onSendLearningMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!learningInput.trim()) return;

    setLearningSubmitting(true);
    setError(null);

    const text = learningInput.trim();
    const userMessage: LearningMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const nextMessages = [...learningMessages, userMessage];
    setLearningMessages(nextMessages);

    const history = learningMessages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.content.trim().length > 0);

    const modeForLearning: CoachMode = learningTopic === "it" ? "technical" : "hr";
    const aiRes = await fetch("/api/coach/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: modeForLearning,
        message: text,
        history,
        assistantType: "learning",
        focus: learningFocusMap[learningTopic],
      }),
    });

    if (!aiRes.ok) {
      const errorPayload = (await aiRes.json().catch(() => null)) as { error?: string } | null;
      setError(errorPayload?.error || t("coachAiFailed"));
      setLearningSubmitting(false);
      return;
    }

    const aiData = (await aiRes.json()) as { reply?: string };
    const aiReply = aiData.reply?.trim() || t("coachDefaultReply");

    setLearningMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: aiReply }]);
    setLearningInput("");
    setLearningSubmitting(false);
  }

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t("aiCareerCoach")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {view === "learn" ? t("coachLearnHint") : t("coachHint")}
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "interview", label: t("interviewCoach") },
          { id: "learn", label: t("learningCoach") },
          { id: "voice", label: t("voiceVivaPractice") },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setView(btn.id as typeof view)}
            className={`group relative px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 overflow-hidden ${
              view === btn.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {view === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
            )}
            {view === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            <span className="relative">{btn.label}</span>
          </button>
        ))}
      </div>

      {view === "voice" ? (
        <VoiceVivaPanel mode={mode} />
      ) : view === "learn" ? (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium">{t("coachLearnTopic")}</p>
            <div className="mt-2 grid gap-2">
              <button onClick={() => setLearningTopic("general")} className={`rounded-lg border px-3 py-2 text-left ${learningTopic === "general" ? "border-primary bg-primary/10" : "border-border"}`}>{t("coachLearnGeneral")}</button>
              <button onClick={() => setLearningTopic("it")} className={`rounded-lg border px-3 py-2 text-left ${learningTopic === "it" ? "border-primary bg-primary/10" : "border-border"}`}>{t("coachLearnIt")}</button>
              <button onClick={() => setLearningTopic("govt")} className={`rounded-lg border px-3 py-2 text-left ${learningTopic === "govt" ? "border-primary bg-primary/10" : "border-border"}`}>{t("coachLearnGovt")}</button>
              <button onClick={() => setLearningTopic("bank")} className={`rounded-lg border px-3 py-2 text-left ${learningTopic === "bank" ? "border-primary bg-primary/10" : "border-border"}`}>{t("coachLearnBank")}</button>
              <button onClick={() => setLearningTopic("ngo")} className={`rounded-lg border px-3 py-2 text-left ${learningTopic === "ngo" ? "border-primary bg-primary/10" : "border-border"}`}>{t("coachLearnNgo")}</button>
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card p-4">
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-2">
              {learningMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("coachLearnEmptyChat")}</p>
              ) : (
                learningMessages.map((m) => (
                  <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.role === "assistant" ? "bg-primary/10 border border-primary/30" : "bg-muted border border-border"}`}>
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{m.role === "assistant" ? t("coachAssistant") : t("you")}</p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))
              )}
            </div>

            <form className="mt-4 space-y-2" onSubmit={onSendLearningMessage}>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                rows={4}
                placeholder={t("coachLearnInputPlaceholder")}
                value={learningInput}
                onChange={(e) => setLearningInput(e.target.value)}
              />
              <button disabled={learningSubmitting} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60">
                {learningSubmitting ? t("coachThinking") : t("send")}
              </button>
            </form>
          </main>
        </div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
        <aside className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{t("coachMode")}</p>
          <div className="mt-2 grid gap-2">
            <button onClick={() => setMode("hr")} className={`rounded-lg border px-3 py-2 text-left ${mode === "hr" ? "border-primary bg-primary/10" : "border-border"}`}>{t("hrMode")}</button>
            <button onClick={() => setMode("technical")} className={`rounded-lg border px-3 py-2 text-left ${mode === "technical" ? "border-primary bg-primary/10" : "border-border"}`}>{t("technicalMode")}</button>
            <button onClick={() => setMode("behavioral")} className={`rounded-lg border px-3 py-2 text-left ${mode === "behavioral" ? "border-primary bg-primary/10" : "border-border"}`}>{t("behavioralMode")}</button>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{t("sessionHistory")}</p>
              <button className="rounded border border-border px-2 py-0.5 text-xs" onClick={onStartSession}>{t("newSession")}</button>
            </div>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("emptySessions")}</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => void loadSession(session.id)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs ${activeSessionId === session.id ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    {session.title ?? t("untitledSession")}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 border-b border-border pb-3">
            <p className="text-sm text-muted-foreground">{activeSession?.title ?? t("noActiveSession")}</p>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-2">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("coachEmptyChat")}</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.role === "assistant" ? "bg-primary/10 border border-primary/30" : "bg-muted border border-border"}`}>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{m.role === "assistant" ? t("coachAssistant") : t("you")}</p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>

          <form className="mt-4 space-y-2" onSubmit={onSendMessage}>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              rows={4}
              placeholder={t("coachInputPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60">
              {submitting ? t("coachThinking") : t("send")}
            </button>
          </form>
        </main>

        <aside className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("answerEvaluation")}</h2>
          {!evaluation ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("emptyEvaluation")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              <ScoreBar label={t("clarity")} value={evaluation.answer_clarity_score} />
              <ScoreBar label={t("confidence")} value={evaluation.confidence_score} />
              <ScoreBar label={t("relevance")} value={evaluation.relevance_score} />
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("feedback")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{evaluation.feedback}</p>
              </div>
            </div>
          )}
        </aside>
      </div>
      )}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
