"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { ensureProfileExists } from "@/lib/profileService";
import { LearningChatWindow } from "./LearningChatWindow";
import { LearningInputBar } from "./LearningInputBar";
import { LearningWelcomeState } from "./LearningWelcomeState";
import dynamic from "next/dynamic";

// Lazy-load full voice conversation experience inside Career Coach AI tab
const VoiceConversation = dynamic(
  () => import("@/components/coach/AIVoiceConversation").then((m) => m.AIVoiceConversation),
  { ssr: false, loading: () => null }
);

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";
const topicLabel: Record<LearningTopic, string> = {
  general: "General",
  it: "IT & Tech",
  govt: "Government / BCS",
  bank: "Banking",
  ngo: "NGO / Dev",
};

interface LearningMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedQuestions?: string[];
}

interface LearningSession {
  id: string;
  topic: LearningTopic;
  title: string;
  messages: LearningMessage[];
  created_at: string;
  updated_at: string;
}

function storageKey(userId: string) {
  return `chakri-learning-sessions:${userId}`;
}

function parseStoredSessions(raw: string | null): LearningSession[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is LearningSession => {
        return (
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as LearningSession).id === "string" &&
          typeof (entry as LearningSession).topic === "string" &&
          typeof (entry as LearningSession).title === "string" &&
          Array.isArray((entry as LearningSession).messages) &&
          typeof (entry as LearningSession).created_at === "string" &&
          typeof (entry as LearningSession).updated_at === "string"
        );
      })
      .map((entry) => ({
        ...entry,
        messages: Array.isArray(entry.messages)
          ? entry.messages.filter(
              (message): message is LearningMessage =>
                typeof message === "object" &&
                message !== null &&
                typeof message.id === "string" &&
                (message.role === "user" || message.role === "assistant") &&
                typeof message.content === "string"
            )
          : [],
      }));
  } catch {
    return [];
  }
}

function buildSessionTitle(messages: LearningMessage[], topic: LearningTopic) {
  const firstUser = messages.find((message) => message.role === "user")?.content.trim();
  if (firstUser) {
    return firstUser.length > 42 ? `${firstUser.slice(0, 39)}...` : firstUser;
  }
  return `${topicLabel[topic]} chat`;
}

function isSupabaseLockAbortError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /AbortError/i.test(error.name) || /Lock broken by another request with the 'steal' option/i.test(error.message);
}

export function ConversationalLearningAI() {
  const { t } = useI18n();
  const supabase = useSupabase();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Chat state
  const [topic, setTopic] = useState<LearningTopic>("general");
  const [messages, setMessages] = useState<LearningMessage[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // UI state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopRequestedRef = useRef(false);
  const streamingTextRef = useRef("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);

  // Initialize
  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, autoScroll]);

  useEffect(() => {
    streamingTextRef.current = streamingText;
  }, [streamingText]);

  // Detect voice support lazily
  useEffect(() => {
    const hasSpeech = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasSynthesis = typeof window !== "undefined" && (window as any).speechSynthesis;
    setVoiceSupported(Boolean(hasSpeech && hasSynthesis));
  }, []);

  async function getUserWithRetry() {
    if (!supabase) {
      throw new Error(t("profileSupabaseMissing"));
    }

    let lastError: unknown = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await supabase.auth.getUser();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts && isSupabaseLockAbortError(error)) {
          await new Promise((resolve) => setTimeout(resolve, 120));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async function init() {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: authData } = await getUserWithRetry();
      if (!authData.user) {
        setError(t("profileAuthRequired"));
        return;
      }

      const uid = authData.user.id;
      setUserId(uid);

      const { error: profileError } = await ensureProfileExists(supabase, uid, {
        username: authData.user.email?.split("@")[0] ?? null,
        full_name: authData.user.user_metadata?.full_name ?? null,
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      const storedSessions = parseStoredSessions(localStorage.getItem(storageKey(uid)));
      const sortedSessions = [...storedSessions].sort((a, b) => {
        const bTs = Date.parse(b.updated_at) || 0;
        const aTs = Date.parse(a.updated_at) || 0;
        return bTs - aTs;
      });

      if (sortedSessions.length > 0) {
        const latest = sortedSessions[0];
        setSessions(sortedSessions);
        setActiveSessionId(latest.id);
        setTopic(latest.topic);
        setMessages(latest.messages);
        setShowWelcome(latest.messages.length === 0);
      } else {
        const now = new Date().toISOString();
        const initialSession: LearningSession = {
          id: crypto.randomUUID(),
          topic: "general",
          title: buildSessionTitle([], "general"),
          messages: [],
          created_at: now,
          updated_at: now,
        };
        setSessions([initialSession]);
        setActiveSessionId(initialSession.id);
        setTopic(initialSession.topic);
        setMessages([]);
        setShowWelcome(true);
        localStorage.setItem(storageKey(uid), JSON.stringify([initialSession]));
      }
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : "Failed to initialize learning coach.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function persistSessions(nextSessions: LearningSession[]) {
    if (!userId) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(nextSessions));
  }

  function commitActiveSession(
    nextMessages: LearningMessage[],
    nextTopic: LearningTopic = topic,
    sessionId: string | null = activeSessionId
  ) {
    if (!sessionId) return;

    const now = new Date().toISOString();
    setSessions((prev) => {
      let found = false;
      const updated = prev.map((session) => {
        if (session.id !== sessionId) return session;
        found = true;
        return {
          ...session,
          topic: nextTopic,
          messages: nextMessages,
          title: buildSessionTitle(nextMessages, nextTopic),
          updated_at: now,
        };
      });

      const next = found
        ? updated
        : [
            {
              id: sessionId,
              topic: nextTopic,
              title: buildSessionTitle(nextMessages, nextTopic),
              messages: nextMessages,
              created_at: now,
              updated_at: now,
            },
            ...updated,
          ];

      const sorted = [...next].sort((a, b) => {
        const bTs = Date.parse(b.updated_at) || 0;
        const aTs = Date.parse(a.updated_at) || 0;
        return bTs - aTs;
      });

      persistSessions(sorted);
      return sorted;
    });
  }

  function createNewSession(nextTopic: LearningTopic = topic) {
    const now = new Date().toISOString();
    const session: LearningSession = {
      id: crypto.randomUUID(),
      topic: nextTopic,
      title: buildSessionTitle([], nextTopic),
      messages: [],
      created_at: now,
      updated_at: now,
    };

    clearTypingInterval();
    stopRequestedRef.current = false;
    setIsThinking(false);
    setStreamingText("");
    setActiveSessionId(session.id);
    setTopic(nextTopic);
    setMessages([]);
    setShowWelcome(true);
    setAutoScroll(true);

    setSessions((prev) => {
      const next = [session, ...prev];
      persistSessions(next);
      return next;
    });

    return session.id;
  }

  function openSession(sessionId: string) {
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) return;

    clearTypingInterval();
    stopRequestedRef.current = false;
    setIsThinking(false);
    setStreamingText("");
    setActiveSessionId(target.id);
    setTopic(target.topic);
    setMessages(target.messages);
    setShowWelcome(target.messages.length === 0);
    setAutoScroll(true);
  }

  function deleteSession(sessionId: string) {
    clearTypingInterval();
    stopRequestedRef.current = false;
    setIsThinking(false);
    setStreamingText("");

    setSessions((prev) => {
      let remaining = prev.filter((session) => session.id !== sessionId);

      if (remaining.length === 0) {
        const now = new Date().toISOString();
        const fallbackSession: LearningSession = {
          id: crypto.randomUUID(),
          topic,
          title: buildSessionTitle([], topic),
          messages: [],
          created_at: now,
          updated_at: now,
        };
        remaining = [fallbackSession];
      }

      if (activeSessionId === sessionId) {
        const nextActive = remaining[0];
        setActiveSessionId(nextActive.id);
        setTopic(nextActive.topic);
        setMessages(nextActive.messages);
        setShowWelcome(nextActive.messages.length === 0);
      }

      persistSessions(remaining);
      return remaining;
    });
  }

  function handleTopicChange(nextTopic: LearningTopic) {
    setTopic(nextTopic);
    commitActiveSession(messages, nextTopic);
  }

  async function onSendMessage(text: string) {
    if (!text.trim() || isThinking) return;

    const ensuredSessionId = activeSessionId ?? createNewSession(topic);
    if (!ensuredSessionId) return;

    setError(null);
    const trimmedText = text.trim();
    setAutoScroll(true);

    // Mark welcome as done
    setShowWelcome(false);

    // Add user message
    const userMsg: LearningMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedText,
    };
    const nextUserMessages = [...messages, userMsg];
    setMessages(nextUserMessages);
    commitActiveSession(nextUserMessages, topic, ensuredSessionId);

    // Show thinking
    setIsThinking(true);
    setStreamingText("");
    stopRequestedRef.current = false;

    try {
      // Prepare context
      const focusMap: Record<LearningTopic, string> = {
        general: "General career guidance in Bangladesh",
        it: "IT and software jobs in Bangladesh",
        govt: "Government and BCS jobs in Bangladesh",
        bank: "Bank and financial sector jobs in Bangladesh",
        ngo: "NGO and development sector jobs in Bangladesh",
      };

      // Build history
      const history = messages
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Fetch AI response
      const aiRes = await fetch("/api/coach/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "hr",
          message: trimmedText,
          history,
          assistantType: "learning",
          focus: focusMap[topic],
        }),
      });

      if (!aiRes.ok) {
        const errorPayload = (await aiRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(errorPayload?.error || t("coachAiFailed"));
        setIsThinking(false);
        return;
      }

      const aiData = (await aiRes.json()) as { reply?: string };
      const aiReply = aiData.reply?.trim() || t("coachDefaultReply");

      // Stream reply with ability to stop
      simulateTypingEffect(aiReply, ensuredSessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get AI response");
      setIsThinking(false);
      setStreamingText("");
    }
  }

  function simulateTypingEffect(text: string, sessionId: string) {
    clearTypingInterval();
    let index = 0;
    typingIntervalRef.current = setInterval(() => {
      if (stopRequestedRef.current) {
        clearTypingInterval();
        setIsThinking(false);
        setStreamingText("");
        return;
      }

      if (index < text.length) {
        const next = text.slice(0, index + 1);
        streamingTextRef.current = next;
        setStreamingText(next);
        index++;
      } else {
        clearTypingInterval();
        const suggestedQuestions = extractSuggestedQuestions(text);
        const aiMsg: LearningMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: text,
          suggestedQuestions,
        };
        setMessages((prev) => {
          const next = [...prev, aiMsg];
          commitActiveSession(next, topic, sessionId);
          return next;
        });
        setIsThinking(false);
        setStreamingText("");
      }
    }, 15);
  }

  function clearTypingInterval() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }

  function stopStreaming() {
    stopRequestedRef.current = true;
    clearTypingInterval();
    const partial = streamingTextRef.current.trim();
    if (partial) {
      const aiMsg: LearningMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: partial,
        suggestedQuestions: extractSuggestedQuestions(partial),
      };
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        commitActiveSession(next, topic);
        return next;
      });
    }
    setIsThinking(false);
    setStreamingText("");
    setAutoScroll(false);
  }

  function extractSuggestedQuestions(text: string): string[] {
    // Simple extraction of lines starting with numbers/bullets
    const lines = text.split("\n");
    const suggested: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for numbered questions or bullet points with question marks
      if (
        /^[\d\.\-\*]\s+.*\?/.test(trimmed) &&
        suggested.length < 2
      ) {
        // Remove bullet/number prefix
        const question = trimmed
          .replace(/^[\d\.\-\*]\s+/, "")
          .replace(/\*\*/g, "");
        if (question.length > 10 && question.length < 100) {
          suggested.push(question);
        }
      }
    }

    return suggested.slice(0, 2); // Max 2 suggestions
  }

  function onSuggestedQuestionClick(question: string) {
    void onSendMessage(question);
  }

  function handleNewSession() {
    createNewSession(topic);
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0d1117]">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-blue-400 mx-auto" />
          <p className="text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0d1117]">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-8 max-w-md">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const streaming = isThinking || Boolean(streamingText);
  const messageCount = messages.length;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0d1117] text-[#e6edf3]">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 w-full max-w-none flex-col overflow-hidden px-0 py-2 sm:px-1 lg:px-2" style={{ fontSize: "13px" }}>
          {/* No utility hamburger in this view */}
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#1f2730] bg-gradient-to-b from-[#0f1628] to-[#0a0f1e]">
            <div className="flex h-full min-h-0 w-full flex-col px-2 py-2 sm:px-3 sm:py-3">
              <div className="mb-3 flex items-center gap-2 border-b border-[#1f2730] pb-3">
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="rounded-lg border border-[#388bfd]/45 bg-[#388bfd]/15 px-3 py-1.5 text-[12px] font-semibold text-[#79c0ff] hover:bg-[#388bfd]/25"
                >
                  + {t("newSession") || "New chat"}
                </button>
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex gap-2 pr-1">
                    {sessions.slice(0, 20).map((session) => {
                      const isActive = session.id === activeSessionId;
                      return (
                        <div
                          key={session.id}
                          className={`inline-flex max-w-[260px] items-center rounded-md border px-1.5 py-1 text-[11px] transition ${
                            isActive
                              ? "border-[#388bfd]/60 bg-[#388bfd]/15 text-[#c9d1d9]"
                              : "border-[#30363d] bg-[#111827] text-[#8b949e] hover:border-[#388bfd]/40 hover:text-[#c9d1d9]"
                          }`}
                          title={session.title}
                        >
                          <button
                            type="button"
                            onClick={() => openSession(session.id)}
                            className="min-w-0 max-w-[220px] truncate px-1"
                          >
                            {session.title}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="ml-1 rounded px-1 text-[#8b949e] hover:bg-[#1f2730] hover:text-[#e6edf3]"
                            aria-label={`Delete ${session.title}`}
                            title="Delete chat"
                          >
                            x
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {showWelcome && messages.length === 0 ? (
                <div className="h-full overflow-y-auto">
                  <LearningWelcomeState
                    topic={topic}
                    onSuggestedQuestion={onSendMessage}
                    variant="embedded"
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <LearningChatWindow
                    messages={messages}
                    streamingText={streamingText}
                    isThinking={isThinking}
                    messagesEndRef={messagesEndRef}
                    onSuggestedQuestion={onSuggestedQuestionClick}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                      setAutoScroll(nearBottom);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {error && messages.length > 0 && (
            <div className="border border-[#1f2730] bg-red-500/10 px-4 py-2 text-[12px] mt-3 rounded-md">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <LearningInputBar
            topic={topic}
            onSendMessage={onSendMessage}
            isLoading={isThinking}
            isStreaming={streaming}
            onStopStreaming={stopStreaming}
            onMicClick={() => setShowVoice(true)}
            voiceAvailable={voiceSupported}
            micActive={showVoice}
            onTopicChange={handleTopicChange}
          />
        </div>
      </div>

      {showVoice && (
        <div className="fixed bottom-20 right-3 z-40 w-[min(92vw,360px)] max-h-[70vh] overflow-hidden rounded-2xl border border-[#30363d] bg-[#0f1624] shadow-2xl sm:right-6">
          <div className="flex items-center justify-between border-b border-[#1f2730] px-3 py-2 text-[12px] text-[#c9d1d9]">
            <span>Voice mode (beta)</span>
            <button onClick={() => setShowVoice(false)} className="text-[#8b949e] hover:text-white">✕</button>
          </div>
          <div className="h-[65vh] max-h-[65vh] overflow-hidden p-2">
            <VoiceConversation mode="hr" />
          </div>
        </div>
      )}
    </div>
  );
}
