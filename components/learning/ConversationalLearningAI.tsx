"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { upsertProfile } from "@/lib/profileService";
import { LearningCategoryPanel } from "./LearningCategoryPanel";
import { LearningChatWindow } from "./LearningChatWindow";
import { LearningInputBar } from "./LearningInputBar";
import { LearningWelcomeState } from "./LearningWelcomeState";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

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

  // UI state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // Initialize
  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Auto-scroll
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

    setLoading(false);
  }

  async function onSendMessage(text: string) {
    if (!text.trim() || isThinking) return;

    setError(null);
    const trimmedText = text.trim();

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

      // Simulate typing effect for streaming
      simulateTypingEffect(aiReply);

      // Extract suggested questions from AI response (simple extraction)
      const suggestedQuestions = extractSuggestedQuestions(aiReply);

      // Add AI message after streaming completes
      setTimeout(() => {
        const aiMsg: LearningMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiReply,
          suggestedQuestions,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsThinking(false);
        setStreamingText("");
      }, aiReply.length * 20 + 200); // Wait for typing effect
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get AI response");
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
    }, 15); // Typing speed
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

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0d1117]">
      {/* Left Category Panel */}
      <LearningCategoryPanel topic={topic} onTopicChange={setTopic} />

      {/* Center Chat Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-white/5 bg-gradient-to-b from-[#0f1628] to-[#0a0f1e]">
        {showWelcome && messages.length === 0 ? (
          <LearningWelcomeState
            topic={topic}
            onSuggestedQuestion={onSendMessage}
          />
        ) : (
          <LearningChatWindow
            messages={messages}
            streamingText={streamingText}
            isThinking={isThinking}
            messagesEndRef={messagesEndRef}
            onSuggestedQuestion={onSuggestedQuestionClick}
          />
        )}

        {/* Error Display */}
        {error && messages.length > 0 && (
          <div className="border-t border-white/5 bg-red-500/10 px-4 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input Bar */}
        <LearningInputBar
          topic={topic}
          onSendMessage={onSendMessage}
          isLoading={isThinking}
        />
      </div>
    </div>
  );
}
