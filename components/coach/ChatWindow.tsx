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

type AssistantBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; text: string; order: string };

function formatInlineRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, idx) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={`${part}-${idx}`} className="font-semibold text-cyan-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${idx}`}>{part}</span>;
  });
}

function parseAssistantBlocks(content: string): AssistantBlock[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    if (/^#{1,3}\s+/.test(line)) {
      return { type: "heading", text: line.replace(/^#{1,3}\s+/, "").trim() };
    }

    if (/^feedback:|^improve:|^next:/i.test(line)) {
      return { type: "heading", text: line };
    }

    const numberedMatch = line.match(/^(\d+)[\.)]\s+(.*)$/);
    if (numberedMatch) {
      return {
        type: "numbered",
        order: numberedMatch[1],
        text: numberedMatch[2].trim(),
      };
    }

    if (/^[-*•]\s+/.test(line)) {
      return { type: "bullet", text: line.replace(/^[-*•]\s+/, "").trim() };
    }

    return { type: "paragraph", text: line };
  });
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {messages.length === 0 && !streamingText && !isThinking && (
          <div className="flex h-full flex-col items-center justify-center space-y-4 py-12 text-center">
            <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {getModeLabel(mode)}
            </div>
            <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">How can I help you today?</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {mode === "technical"
                ? t("technicalModeDescription") || "Ask technical interview questions and get focused, practical coaching."
                : mode === "behavioral"
                  ? t("behavioralModeDescription") || "Practice behavioral answers and improve your structure with actionable feedback."
                  : t("hrModeDescription") || "Get HR interview prep guidance with clear next steps for better responses."}
            </p>
            <p className="text-xs text-muted-foreground/60">{t("startTypingToBegin") || "Start typing below to begin your coaching session"}</p>
            <div className="grid w-full max-w-3xl gap-2 sm:grid-cols-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt?.(prompt)}
                  className="ui-transition-soft rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-left text-xs text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-500/10"
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
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="space-y-1 text-left">
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
  const assistantBlocks = parseAssistantBlocks(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: isStreaming ? 0 : Math.min(index * 0.05, 0.2) }}
      className={`flex ${isUser ? "justify-end" : "justify-center"}`}
    >
      {isUser ? (
        <div className="w-full max-w-xl rounded-2xl rounded-br-none bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-blue-500/20">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      ) : (
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 backdrop-blur-sm">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-200">AI Coach</div>
          <div className="space-y-2.5 text-sm leading-7">
            {assistantBlocks.map((block, blockIdx) => {
              if (block.type === "heading") {
                return (
                  <p key={`${message.id}-heading-${blockIdx}`} className="whitespace-pre-wrap break-words font-semibold text-cyan-200">
                    {formatInlineRichText(block.text)}
                  </p>
                );
              }

              if (block.type === "bullet") {
                return (
                  <div key={`${message.id}-bullet-${blockIdx}`} className="flex items-start gap-2 text-slate-100">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" aria-hidden="true" />
                    <p className="whitespace-pre-wrap break-words">{formatInlineRichText(block.text)}</p>
                  </div>
                );
              }

              if (block.type === "numbered") {
                return (
                  <div key={`${message.id}-numbered-${blockIdx}`} className="flex items-start gap-2 text-slate-100">
                    <span className="mt-0.5 w-5 shrink-0 font-semibold text-cyan-200">{block.order}.</span>
                    <p className="whitespace-pre-wrap break-words">{formatInlineRichText(block.text)}</p>
                  </div>
                );
              }

              return (
                <p key={`${message.id}-paragraph-${blockIdx}`} className="whitespace-pre-wrap break-words text-slate-100">
                  {formatInlineRichText(block.text)}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
