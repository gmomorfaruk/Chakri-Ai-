"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
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
import { ChatWindow } from "./ChatWindow";
import { ChatInputBar } from "./ChatInputBar";
import { SessionsSidebar } from "./SessionsSidebar";
import { EvaluationPanel } from "./EvaluationPanel";

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
    setStreamingText("");

    const [messagesRes, evaluationRes] = await Promise.all([
      getCoachMessages(supabase, sessionId),
      getLatestCoachEvaluation(supabase, sessionId),
    ]);

    setMessages(messagesRes.data ?? []);
    setEvaluation(evaluationRes.data ?? null);
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
    if (!supabase || !userId || !text.trim()) return;

    setError(null);
    const trimmedText = text.trim();

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) return;
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

    // Reload messages immediately
    await loadSession(sessionId);

    // Show thinking indicator
    setIsThinking(true);
    setStreamingText("");

    // Prepare history
    const history = messages
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

      // Save AI message
      const { error: aiMsgError } = await addCoachMessage(supabase, {
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        content: aiReply,
      });

      if (aiMsgError) {
        setError(aiMsgError.message);
        setIsThinking(false);
        return;
      }

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

      // Reload to get fresh data
      await loadSession(sessionId);
    } finally {
      setIsThinking(false);
      setStreamingText("");
    }
  }

  function simulateTypingEffect(text: string) {
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setStreamingText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 20); // Adjust speed here (lower = faster)
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-t-2 border-blue-500" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !activeSessionId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0a0f1e]">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0a0f1e]">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-white/5 bg-gradient-to-b from-[#0f1628] to-[#0a0f1e]">
        {/* Chat Messages */}
        <ChatWindow
          messages={messages}
          streamingText={streamingText}
          isThinking={isThinking}
          messagesEndRef={messagesEndRef}
          mode={mode}
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
