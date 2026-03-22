"use client";

import { useEffect, useRef } from "react";

interface VoiceMessage {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

interface VoiceTranscriptBubblesProps {
  messages: VoiceMessage[];
  liveTranscript: string;
}

export function VoiceTranscriptBubbles({
  messages,
  liveTranscript,
}: VoiceTranscriptBubblesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <div
          key={msg.timestamp}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
          <div
            className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
              msg.role === "user"
                ? "bg-blue-600/80 text-white"
                : "bg-slate-700/80 text-slate-100"
            }`}
          >
            <p className="text-xs font-semibold mb-1 opacity-70">
              {msg.role === "user" ? "You" : "AI"}
            </p>
            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
          </div>
        </div>
      ))}

      {/* Live transcript as user types */}
      {liveTranscript && (
        <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="max-w-xs rounded-lg px-4 py-2 text-sm bg-blue-600/50 text-white border border-blue-400/50">
            <p className="text-xs font-semibold mb-1 opacity-70">You</p>
            <p className="leading-relaxed whitespace-pre-wrap break-words italic opacity-80">
              {liveTranscript}
            </p>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
