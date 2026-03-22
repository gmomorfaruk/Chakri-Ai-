"use client";

interface VoiceFeedbackPanelProps {
  fillerCount: number;
  confidence: number;
}

export function VoiceFeedbackPanel({ fillerCount, confidence }: VoiceFeedbackPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-900/50 backdrop-blur-sm p-4 border border-slate-700">
      {/* Filler words badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Filler Words
          </p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${
              fillerCount === 0
                ? "bg-green-500/20 text-green-300"
                : fillerCount <= 3
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {fillerCount}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {fillerCount === 0
            ? "Perfect! No filler words detected"
            : fillerCount <= 3
            ? "Good! Keep it minimal"
            : "Try to reduce filler words"}
        </p>
      </div>

      {/* Confidence meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Confidence
          </p>
          <span className="text-xs font-bold text-blue-300">{Math.round(confidence)}%</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full transition-all duration-300 ${
              confidence >= 80
                ? "bg-gradient-to-r from-green-500 to-green-400"
                : confidence >= 60
                ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                : "bg-gradient-to-r from-red-500 to-red-400"
            }`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
