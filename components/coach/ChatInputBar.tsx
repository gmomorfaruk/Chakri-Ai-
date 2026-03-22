"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { Mic, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputBarProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export function ChatInputBar({ onSendMessage, isLoading = false }: ChatInputBarProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Calculate rows
    const lineCount = value.split("\n").length;
    setRows(Math.min(lineCount, 4)); // Max 4 rows
  };

  // Handle Enter and Shift+Enter
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: Add newline (default behavior)
        return;
      }

      // Enter: Send message
      e.preventDefault();
      if (input.trim() && !isLoading) {
        await onSendMessage(input);
        setInput("");
        setRows(1);

        // Reset focus
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    }
  };

  return (
    <div className="border-t border-white/5 bg-gradient-to-t from-[#0a0f1e] to-[#0f1628] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              void onSendMessage(input);
              setInput("");
              setRows(1);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }
          }}
          className="flex gap-3"
        >
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all focus-within:border-blue-500/50 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-blue-500/10">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t("coachInputPlaceholder") || "Message the coach..."}
              rows={rows}
              disabled={isLoading}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-end gap-2">
            {/* Mic Button (placeholder) */}
            <button
              type="button"
              disabled={isLoading}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              title={t("voiceInput") || "Voice input (coming soon)"}
            >
              <Mic className="h-5 w-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white transition-all hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50"
              title={t("send") || "Send"}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>

        <p className="mt-2 text-xs text-muted-foreground/60">
          {t("enterToSend") || "Press Enter to send, Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
