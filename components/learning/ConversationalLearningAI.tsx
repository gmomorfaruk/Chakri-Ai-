"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { ensureProfileExists } from "@/lib/profileService";
import { LearningChatWindow } from "./LearningChatWindow";
import { LearningInputBar } from "./LearningInputBar";
import { LearningWelcomeState } from "./LearningWelcomeState";
import { LearningCategoryPanel } from "./LearningCategoryPanel";
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

export function ConversationalLearningAI() {
  const { t } = useI18n();
  const supabase = useSupabase();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [topic, setTopic] = useState<LearningTopic>("general");
const [messages, setMessages] = useState<LearningMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [sidebarOpen] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // UI state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopRequestedRef = useRef(false);
  const streamingTextRef = useRef("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [utilityOpen, setUtilityOpen] = useState(false);

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

    setLoading(false);
  }

  async function onSendMessage(text: string) {
    if (!text.trim() || isThinking) return;

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
    setMessages((prev) => [...prev, userMsg]);

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
      simulateTypingEffect(aiReply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get AI response");
      setIsThinking(false);
      setStreamingText("");
    }
  }

  function simulateTypingEffect(text: string) {
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
        setMessages((prev) => [...prev, aiMsg]);
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
      setMessages((prev) => [...prev, aiMsg]);
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
    setMessages([]);
    setStreamingText("");
    setIsThinking(false);
    setShowWelcome(true);
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
      {/* Sidebar stays always on (no collapse) */}
      <div className="hidden md:block">
        <LearningCategoryPanel topic={topic} onTopicChange={setTopic} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 justify-center">
        <div className="flex min-h-0 min-w-0 flex-1 max-w-5xl flex-col overflow-hidden px-4 py-4 lg:px-6" style={{ fontSize: "13px" }}>
          {/* No utility hamburger in this view */}
          <div className="flex-1 overflow-auto bg-gradient-to-b from-[#0f1628] to-[#0a0f1e] rounded-xl border border-[#1f2730]">
            <div className="h-full w-full overflow-auto px-4 py-4">
              {showWelcome && messages.length === 0 ? (
                <LearningWelcomeState
                  topic={topic}
                  onSuggestedQuestion={onSendMessage}
                  variant="embedded"
                />
              ) : (
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
            onTopicChange={setTopic}
          />
        </div>
      </div>

      {showVoice && (
        <div className="fixed bottom-20 right-6 z-40 w-[360px] max-h-[70vh] overflow-hidden rounded-2xl border border-[#30363d] bg-[#0f1624] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1f2730] px-3 py-2 text-[12px] text-[#c9d1d9]">
            <span>Voice mode (beta)</span>
            <button onClick={() => setShowVoice(false)} className="text-[#8b949e] hover:text-white">✕</button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-2">
            <VoiceConversation mode="hr" />
          </div>
        </div>
      )}
    </div>
  );
}
