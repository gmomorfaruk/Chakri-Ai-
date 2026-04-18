"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { CoachMessage, CoachMode } from "@/types/coach";
import { motion } from "framer-motion";

interface ChatWindowProps {
  messages: CoachMessage[];
  streamingText: string;
  isThinking: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  mode: CoachMode;
  onQuickPrompt?: (prompt: string) => void;
}

export function ChatWindow({
  messages,
  streamingText,
  isThinking,
  messagesEndRef,
  mode,
  onQuickPrompt,
}: ChatWindowProps) {
  const { t } = useI18n();

  const visibleMessages = messages.filter((message, index, all) => {
    if (index === 0) return true;

    const previous = all[index - 1];
    if (!previous) return true;

    if (message.role !== "assistant" || previous.role !== "assistant") {
      return true;
    }

    const sameContent = message.content.trim() === previous.content.trim();
    const previousTs = Date.parse(previous.created_at || "");
    const currentTs = Date.parse(message.created_at || "");
    const gapMs = Math.abs(currentTs - previousTs);
    const closeInTime = Number.isFinite(gapMs) && gapMs < 12000;

    return !(sameContent && closeInTime);
  });

  const quickPrompts =
    mode === "technical"
      ? [
          "Ask me one backend debugging question.",
          "Give me a concise system design interview question.",
          "Evaluate this answer using STAR and one improvement point.",
        ]
      : mode === "behavioral"
        ? [
            "Ask a teamwork conflict interview question.",
            "Give me one leadership scenario question.",
            "Review my answer and give two specific improvements.",
          ]
        : [
            "Ask me one HR interview question.",
            "Review my answer in 3 to 5 short lines.",
            "Give me one follow-up question for practice.",
          ];

  const getModeLabel = (m: CoachMode) => {
    switch (m) {
      case "technical":
        return "🧠 Technical Coach";
      case "behavioral":
        return "💬 Behavioral Coach";
      default:
        return "👔 HR Coach";
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.length === 0 && !streamingText && !isThinking && (
          <div className="flex h-full flex-col items-center justify-center space-y-4 py-12 text-center">
            <div className="text-4xl opacity-50">{mode === "technical" ? "🧠" : mode === "behavioral" ? "💬" : "👔"}</div>
            <h2 className="text-2xl font-semibold text-white">{getModeLabel(mode)}</h2>
            <p className="max-w-md text-muted-foreground">
              {mode === "technical" ? t("technicalModeDescription") || "Ask technical interview questions and get expert coaching." : mode === "behavioral" ? t("behavioralModeDescription") || "Practice answering behavioral questions with targeted feedback." : t("hrModeDescription") || "Get HR interview preparation guidance from an expert coach."}
            </p>
            <p className="text-xs text-muted-foreground/60">{t("startTypingToBegin") || "Start typing to begin your coaching session"}</p>
            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt?.(prompt)}
                  className="ui-transition-soft rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-500/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {visibleMessages.map((message, idx) => (
          <MessageBubble key={message.id} message={message} index={idx} />
        ))}

        {/* Streaming AI Response */}
        {streamingText && (
          <MessageBubble
            message={{
              id: "streaming",
              session_id: "",
              user_id: "",
              role: "assistant",
              content: streamingText,
              created_at: new Date().toISOString(),
            }}
            index={visibleMessages.length}
            isStreaming
          />
        )}

        {/* Thinking Indicator */}
        {isThinking && !streamingText && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="space-y-1">
              <div className="flex space-x-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-xs text-muted-foreground">{t("aiIsThinking") || "AI is thinking..."}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: CoachMessage;
  index: number;
  isStreaming?: boolean;
}

function MessageBubble({ message, index, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const lines = message.content.split("\n").map((line) => line.trim()).filter(Boolean);
  const showStructuredAssistant = !isUser && lines.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: isStreaming ? 0 : Math.min(index * 0.05, 0.2) }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-xl gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div
          className={`h-8 w-8 shrink-0 rounded-full ${
            isUser
              ? "bg-gradient-to-r from-blue-500 to-cyan-500"
              : "bg-gradient-to-r from-purple-500 to-pink-500"
          } flex items-center justify-center text-white text-sm font-semibold`}
        >
          {isUser ? "Y" : "AI"}
        </div>

        {/* Message Content */}
        <div className="flex max-w-xs flex-col sm:max-w-md">
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-lg backdrop-blur-sm ${
              isUser
                ? "rounded-br-none bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/20"
                : "rounded-bl-none border border-white/10 bg-white/5 text-gray-100 shadow-purple-500/10"
            }`}
          >
            {showStructuredAssistant ? (
              <div className="space-y-1.5 text-sm leading-relaxed">
                {lines.map((line, lineIdx) => {
                  const isHeading = /^feedback:|^improve:|^next:/i.test(line);
                  return (
                    <p
                      key={`${message.id}-${lineIdx}`}
                      className={`whitespace-pre-wrap break-words ${isHeading ? "font-semibold text-cyan-200" : "text-slate-100"}`}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
