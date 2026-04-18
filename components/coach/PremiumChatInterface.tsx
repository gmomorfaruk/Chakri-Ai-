"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { syncAdaptiveSignals } from "@/lib/adaptiveIntelligenceClient";
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
import { ensureProfileExists } from "@/lib/profileService";
import { CoachEvaluation, CoachMessage, CoachMode, CoachSession } from "@/types/coach";
import { ChatWindow } from "./ChatWindow";
import { ChatInputBar } from "./ChatInputBar";
import { SessionsSidebar } from "./SessionsSidebar";
import { EvaluationPanel } from "./EvaluationPanel";

function extractRecommendationFromCoachReply(reply: string) {
  const lines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const nextLine = lines.find((line) => /^next:/i.test(line));
  if (nextLine) {
    return nextLine.replace(/^next:\s*/i, "").trim();
  }

  const feedbackLine = lines.find((line) => /^feedback:/i.test(line));
  if (feedbackLine) {
    return feedbackLine.replace(/^feedback:\s*/i, "").trim();
  }

  return lines[0] || "";
}

export function PremiumChatInterface() {
  const { t } = useI18n();
  const supabase = useSupabase();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<CoachMode>("hr");

  // Session & Message state
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [evaluation, setEvaluation] = useState<CoachEvaluation | null>(null);

  // UI state
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize
  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Auto-scroll to bottom when messages or streaming text changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

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

    const { error: profileError } = await ensureProfileExists(supabase, uid, {
      username: authData.user.email?.split("@")[0] ?? null,
      full_name: authData.user.user_metadata?.full_name ?? null,
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
    stopTypingEffect();
    setStreamingText("");

    const [messagesRes, evaluationRes] = await Promise.all([
      getCoachMessages(supabase, sessionId),
      getLatestCoachEvaluation(supabase, sessionId),
    ]);

    const loadedMessages = messagesRes.data ?? [];

    setMessages(loadedMessages);
    setEvaluation(evaluationRes.data ?? null);
    return loadedMessages;
  }

  async function createNewSession() {
    if (!supabase || !userId) return null;

    const { data, error: createError } = await createCoachSession(supabase, {
      user_id: userId,
      mode,
      title: generateSessionTitle(mode, "New Session"),
    });

    if (createError || !data) {
      setError(createError?.message ?? t("coachSessionCreateFailed"));
      return null;
    }

    const updated = [data, ...sessions];
    setSessions(updated);
    setActiveSessionId(data.id);
    setMessages([]);
    setEvaluation(null);
    setStreamingText("");
    return data.id;
  }

  async function onSendMessage(text: string) {
    if (!supabase || !userId || !text.trim() || sendingRef.current) return;

    sendingRef.current = true;
    setIsThinking(true);
    setStreamingText("");

    setError(null);
    const trimmedText = text.trim();

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) return;
    }

    // Skip accidental immediate duplicate user send in the same session.
    const { data: latestUserMessage } = await supabase
      .from("coach_messages")
      .select("content, created_at")
      .eq("session_id", sessionId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ content: string; created_at: string }>();

    if (latestUserMessage) {
      const sameContent = latestUserMessage.content.trim() === trimmedText;
      const ageMs = Date.now() - Date.parse(latestUserMessage.created_at || "");
      if (sameContent && Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 5000) {
        sendingRef.current = false;
        setIsThinking(false);
        return;
      }
    }

    // Add user message
    const { error: userMsgError } = await addCoachMessage(supabase, {
      session_id: sessionId,
      user_id: userId,
      role: "user",
      content: trimmedText,
    });

    if (userMsgError) {
      setError(userMsgError.message);
      return;
    }

    // Reload messages immediately and use this exact snapshot as history.
    const latestMessages = (await loadSession(sessionId)) ?? [];

    // Prepare history
    const history = latestMessages
      .slice(-8)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
      .filter((m) => m.content.trim().length > 0);

    try {
      // Fetch AI response
      const aiRes = await fetch("/api/coach/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: trimmedText, history }),
      });

      if (!aiRes.ok) {
        const errorPayload = (await aiRes.json().catch(() => null)) as { error?: string } | null;
        setError(errorPayload?.error || t("coachAiFailed"));
        setIsThinking(false);
        await loadSession(sessionId);
        return;
      }

      const aiData = (await aiRes.json()) as { reply?: string };
      const aiReply = aiData.reply?.trim() || t("coachDefaultReply");

      // Simulate streaming with typing effect
      simulateTypingEffect(aiReply);

      // Skip accidental immediate duplicate assistant insert in the same session.
      const { data: latestAssistantMessage } = await supabase
        .from("coach_messages")
        .select("content, created_at")
        .eq("session_id", sessionId)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ content: string; created_at: string }>();

      let aiMsgError: { message?: string } | null = null;
      const isDuplicateAssistant = (() => {
        if (!latestAssistantMessage) return false;
        const sameContent = latestAssistantMessage.content.trim() === aiReply;
        const ageMs = Date.now() - Date.parse(latestAssistantMessage.created_at || "");
        return sameContent && Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 12000;
      })();

      if (!isDuplicateAssistant) {
        const insertResult = await addCoachMessage(supabase, {
          session_id: sessionId,
          user_id: userId,
          role: "assistant",
          content: aiReply,
        });
        aiMsgError = insertResult.error;
      }

      if (aiMsgError) {
        setError(aiMsgError.message);
        setIsThinking(false);
        return;
      }

      // Avoid rendering a second transient streaming bubble after persistence.
      stopTypingEffect();
      setStreamingText("");

      // Generate and save evaluation
      const evalPayload = localEvaluateAnswer(trimmedText);
      const { error: evalError } = await addCoachEvaluation(supabase, {
        session_id: sessionId,
        user_id: userId,
        ...evalPayload,
      });

      if (evalError) {
        setError(evalError.message);
      }

      void syncAdaptiveSignals(supabase, {
        signals: [
          {
            domain: "interview",
            signalType: "interview_answer_evaluated",
            metricValue: evalPayload.confidence_score,
            source: "premium_chat_interface",
            payload: {
              mode,
              clarity: evalPayload.answer_clarity_score,
              confidence: evalPayload.confidence_score,
              relevance: evalPayload.relevance_score,
            },
          },
          {
            domain: "recommendation",
            signalType: "interview_coach_recommendation",
            metricValue: 1,
            source: "premium_chat_interface",
            payload: {
              recommendation: extractRecommendationFromCoachReply(aiReply),
            },
          },
        ],
        summary: {
          interview: {
            sessionsIncrement: 1,
            confidence: evalPayload.confidence_score,
            clarity: evalPayload.answer_clarity_score,
            relevance: evalPayload.relevance_score,
            mode,
          },
          recommendations: [extractRecommendationFromCoachReply(aiReply)].filter(Boolean),
        },
      });

      // Reload to get fresh data
      await loadSession(sessionId);
    } finally {
      stopTypingEffect();
      sendingRef.current = false;
      setIsThinking(false);
      setStreamingText("");
    }
  }

  function stopTypingEffect() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }

  function simulateTypingEffect(text: string) {
    stopTypingEffect();
    let index = 0;
    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setStreamingText(text.slice(0, index + 1));
        index++;
      } else {
        stopTypingEffect();
      }
    }, 20); // Adjust speed here (lower = faster)
  }

  if (loading) {
    return (
      <div className="ui-page flex h-full min-h-0 items-center justify-center p-4">
        <div className="ui-skeleton w-full max-w-4xl p-5 sm:p-6">
          <div className="space-y-3">
            <div className="ui-skeleton-line h-6 w-1/3" />
            <div className="ui-skeleton-line w-2/3" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="ui-skeleton h-32" />
            <div className="ui-skeleton h-32" />
          </div>
          <p className="mt-4 text-sm text-slate-400">{t("loading") || "Loading your interview workspace..."}</p>
        </div>
      </div>
    );
  }

  if (error && !activeSessionId) {
    return (
      <div className="ui-page flex h-full min-h-0 items-center justify-center p-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void init()}
            className="mt-3 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            Retry loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page flex h-full min-h-0 w-full overflow-hidden">
      {/* Left Sidebar - Sessions */}
      <SessionsSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        mode={mode}
        onLoadSession={loadSession}
        onCreateSession={createNewSession}
        onModeChange={setMode}
      />

      {/* Center - Chat */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] md:border-l md:border-white/5">
        {/* Mobile Controls */}
        <div className="border-b border-white/5 px-3 py-2 md:hidden">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {([
              { id: "hr", label: t("hrMode") || "HR" },
              { id: "technical", label: t("technicalMode") || "Technical" },
              { id: "behavioral", label: t("behavioralMode") || "Behavioral" },
            ] as Array<{ id: CoachMode; label: string }>).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === item.id
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    : "border border-white/15 bg-white/5 text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void createNewSession()}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            {t("newSession") || "New Chat"}
          </button>
        </div>

        {/* Chat Messages */}
        <ChatWindow
          messages={messages}
          streamingText={streamingText}
          isThinking={isThinking}
          messagesEndRef={messagesEndRef}
          mode={mode}
          onQuickPrompt={(prompt) => {
            if (!isThinking) {
              void onSendMessage(prompt);
            }
          }}
        />

        {/* Error Display */}
        {error && (
          <div className="border-t border-white/5 bg-red-500/10 px-4 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input Bar */}
        <ChatInputBar onSendMessage={onSendMessage} isLoading={isThinking} />
      </div>

      {/* Right Panel - Evaluation */}
      <EvaluationPanel evaluation={evaluation} />
    </div>
  );
}
