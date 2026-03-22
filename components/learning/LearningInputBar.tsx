"use client";

import { Send } from "lucide-react";
import { useRef, useState } from "react";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

interface LearningInputBarProps {
  topic: LearningTopic;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const topicBadges: Record<LearningTopic, { icon: string; label: string; color: string }> = {
  general: { icon: "🎯", label: "General", color: "bg-blue-500/20 border-blue-500/40" },
  it: { icon: "💻", label: "IT & Tech", color: "bg-cyan-500/20 border-cyan-500/40" },
  govt: { icon: "🏛️", label: "Government", color: "bg-purple-500/20 border-purple-500/40" },
  bank: { icon: "🏦", label: "Banking", color: "bg-pink-500/20 border-pink-500/40" },
  ngo: { icon: "🤝", label: "NGO", color: "bg-green-500/20 border-green-500/40" },
};

export function LearningInputBar({
  topic,
  onSendMessage,
  isLoading = false,
}: LearningInputBarProps) {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Calculate rows
    const lineCount = value.split("\n").length;
    setRows(Math.min(lineCount, 4));
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: Add newline (default behavior)
        return;
      }

      // Enter: Send message
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSendMessage(input);
        setInput("");
        setRows(1);

        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    }
  };

  const badge = topicBadges[topic];

  return (
    <div className="border-t border-white/5 bg-gradient-to-t from-[#0d1117] to-[#161b22] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* Topic Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge.color}`}
          >
            <span className="text-sm">{badge.icon}</span>
            <span className="text-gray-300">{badge.label}</span>
          </div>
          <p className="text-xs text-gray-600">Focus area selected</p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              onSendMessage(input);
              setInput("");
              setRows(1);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }
          }}
          className="flex gap-3"
        >
          <div className="flex-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm transition-all focus-within:border-blue-500/50 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-blue-500/10 px-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about careers, skills, interview prep, opportunities..."
              rows={rows}
              disabled={isLoading}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white transition-all hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        <p className="text-xs text-gray-600">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
