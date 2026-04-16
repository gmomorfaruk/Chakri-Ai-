"use client";

import { Mic, Send } from "lucide-react";
import { useRef, useState } from "react";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

interface LearningInputBarProps {
  topic: LearningTopic;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  onMicClick?: () => void;
  voiceAvailable?: boolean;
  micActive?: boolean;
  onTopicChange?: (topic: LearningTopic) => void;
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
  isStreaming = false,
  onStopStreaming,
  onMicClick,
  voiceAvailable = true,
  micActive = false,
  onTopicChange,
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
    <div className="border-t border-[#1f2730] bg-[#0d1117] px-4 py-3 sm:px-6 lg:px-8 text-[13px]">
      <div className="mx-auto max-w-3xl space-y-2">
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
          className="flex items-center gap-2"
        >
          {/* Context dropdown pill */}
          <div className={`flex items-center gap-1 rounded-full border px-2 py-1.5 text-[12px] font-semibold ${badge.color}`}>
            <span>{badge.icon}</span>
            <select
              value={topic}
              onChange={(e) => onTopicChange?.(e.target.value as LearningTopic)}
              className="bg-transparent text-[#c9d1d9] outline-none cursor-pointer pr-4"
            >
              {Object.entries(topicBadges).map(([key, value]) => (
                <option key={key} value={key} className="bg-[#111827] text-[#e6edf3]">
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <div className="flex-1 rounded-lg border border-[#30363d] bg-[#111827] px-3 py-2 focus-within:border-[#388bfd]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about careers, skills, interview prep, opportunities..."
              rows={rows}
              disabled={isLoading}
              className="w-full resize-none bg-transparent text-[#e6edf3] placeholder-[#8b949e] outline-none text-sm"
            />
          </div>

          {/* Mic */}
          <button
            type="button"
            onClick={onMicClick}
            disabled={!voiceAvailable}
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-[#e6edf3] transition ${
              micActive
                ? "border-[#388bfd] bg-[#0f1724] shadow-lg shadow-blue-500/20"
                : "border-[#30363d] bg-[#111827] hover:border-[#388bfd]"
            } ${!voiceAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label="Toggle voice input"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Send Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="flex h-11 w-24 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-red-500/40"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white transition-all hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </form>

        <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
          <span>Press Enter to send · Shift+Enter for new line</span>
          {voiceAvailable ? <span>Voice available</span> : <span className="text-red-400">Voice unavailable</span>}
        </div>
      </div>
    </div>
  );
}
