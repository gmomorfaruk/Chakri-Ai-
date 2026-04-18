"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface LearningChatWindowProps {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    suggestedQuestions?: string[];
  }>;
  streamingText: string;
  isThinking: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSuggestedQuestion: (question: string) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export function LearningChatWindow({
  messages,
  streamingText,
  isThinking,
  messagesEndRef,
  onSuggestedQuestion,
  onScroll,
}: LearningChatWindowProps) {
  const { t } = useI18n();
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#0d1117] to-[#0a0f1e] px-4 py-6 sm:px-6 lg:px-8"
      onScroll={onScroll}
    >
      <div className="mx-auto w-full max-w-none space-y-4">
        {/* Messages */}
        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            index={idx}
            onSuggestedQuestion={onSuggestedQuestion}
          />
        ))}

        {/* Streaming AI Response */}
        {streamingText && (
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingText,
            }}
            index={messages.length}
            isStreaming
          />
        )}

        {/* Thinking Indicator */}
        {isThinking && !streamingText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="space-y-1">
              <div className="flex gap-1">
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-400"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-400"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="h-2 w-2 rounded-full bg-blue-400"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500">{t("aiIsThinking")}</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    suggestedQuestions?: string[];
  };
  index: number;
  isStreaming?: boolean;
  onSuggestedQuestion?: (question: string) => void;
}

function MessageBubble({
  message,
  index,
  isStreaming,
  onSuggestedQuestion,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: isStreaming ? 0 : Math.min(index * 0.05, 0.2),
      }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex w-full max-w-4xl gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div
          className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
            isUser
              ? "bg-gradient-to-r from-blue-500 to-cyan-500"
              : "bg-gradient-to-r from-purple-500 to-pink-500"
          }`}
        >
          {isUser ? "you" : "AI"}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-2">
          <div
            className={`rounded-2xl px-4 py-3 backdrop-blur-sm ${
              isUser
                ? "rounded-br-none bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                : "rounded-bl-none border border-white/10 bg-white/5 text-gray-100 shadow-purple-500/10"
            }`}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <div className="text-sm leading-relaxed">
                <MarkdownRenderer content={message.content} />
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          {!isUser &&
            message.suggestedQuestions &&
            message.suggestedQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-2 mt-2"
              >
                {message.suggestedQuestions.map((question, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => onSuggestedQuestion?.(question)}
                    whileHover={{ x: 4 }}
                    className="text-left px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-gray-100 transition-all group"
                  >
                    <span className="text-gray-500 group-hover:text-gray-400">
                      ↳{" "}
                    </span>
                    {question}
                  </motion.button>
                ))}
              </motion.div>
            )}
        </div>
      </div>
    </motion.div>
  );
}
