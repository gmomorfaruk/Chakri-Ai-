"use client";

import { Mic, Loader } from "lucide-react";

interface VoiceControlBarProps {
  state: "idle" | "listening" | "thinking" | "speaking" | "your_turn";
  sessionStarted: boolean;
  onMicClick: () => void;
}

export function VoiceControlBar({ state, sessionStarted, onMicClick }: VoiceControlBarProps) {
  const isActive = state === "listening";
  const isDisabled = state === "thinking" || state === "speaking";

  // Determine button appearance
  const getButtonClass = () => {
    const baseClass =
      "relative w-24 h-24 rounded-full font-bold text-white transition-all duration-200";

    if (isDisabled) {
      return `${baseClass} bg-slate-600 cursor-not-allowed opacity-60`;
    }

    if (isActive) {
      return `${baseClass} bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/50 animate-pulse`;
    }

    if (!sessionStarted) {
      return `${baseClass} bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/50`;
    }

    return `${baseClass} bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg shadow-slate-500/30`;
  };

  const getStatusText = () => {
    if (!sessionStarted) return "Start";
    if (isActive) return "Stop";
    if (isDisabled) return state === "thinking" ? "..." : "...";
    return "Speak";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onMicClick}
        disabled={isDisabled}
        className={`${getButtonClass()} flex items-center justify-center`}
        aria-label="Microphone control"
      >
        {isDisabled ? (
          <Loader className="w-10 h-10 animate-spin" />
        ) : isActive ? (
          <div className="w-10 h-10 rounded-full bg-white/30 animate-pulse" />
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </button>

      <p className="text-sm font-medium text-slate-300">{getStatusText()}</p>
    </div>
  );
}
