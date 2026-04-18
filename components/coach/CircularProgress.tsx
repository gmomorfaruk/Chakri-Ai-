"use client";

import { motion } from "framer-motion";

interface CircularProgressProps {
  value: number;
  label: string;
  color?: "blue" | "purple" | "cyan" | "pink";
  size?: "sm" | "md" | "lg";
}

export function CircularProgress({
  value,
  label,
  color = "blue",
  size = "md",
}: CircularProgressProps) {
  const circumference = 2 * Math.PI * 45; // radius = 45

  const colorClasses = {
    blue: {
      gradient: "from-blue-400 to-cyan-400",
      shadow: "shadow-blue-500/50",
    },
    purple: {
      gradient: "from-purple-400 to-pink-400",
      shadow: "shadow-purple-500/50",
    },
    cyan: {
      gradient: "from-cyan-400 to-blue-400",
      shadow: "shadow-cyan-500/50",
    },
    pink: {
      gradient: "from-pink-400 to-purple-400",
      shadow: "shadow-pink-500/50",
    },
  };

  const sizeClasses = {
    sm: "h-24 w-24",
    md: "w-28 h-28",
    lg: "w-32 h-32",
  };

  const valueTextClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const { gradient, shadow } = colorClasses[color];

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Background circle */}
        <svg
          className="h-full w-full transform -rotate-90"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />

          {/* Animated progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (value / 100) * circumference}
            strokeLinecap="round"
            className={`bg-gradient-to-r ${gradient} stroke-current transition-all duration-500`}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: circumference - (value / 100) * circumference,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 8px rgba(var(--color-shadow), 0.5))`,
            }}
          >
            <style>
              {`
                circle {
                  background: linear-gradient(135deg, var(--color-start), var(--color-end));
                  --color-start: ${color === "blue" ? "#60a5fa" : color === "purple" ? "#a78bfa" : color === "cyan" ? "#22d3ee" : "#f472b6"};
                  --color-end: ${color === "blue" ? "#06b6d4" : color === "purple" ? "#ec4899" : color === "cyan" ? "#0ea5e9" : "#a78bfa"};
                }
              `}
            </style>
          </motion.circle>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span
              className={`block leading-none tabular-nums ${valueTextClasses[size]} font-bold tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
            >
              {Math.round(value)}%
            </span>
          </motion.div>
        </div>

        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} opacity-0 blur-md transition-opacity duration-500 pointer-events-none`}
          style={{
            opacity: Math.min(value / 100, 1) * 0.2,
          }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-200">{label}</p>
      </div>
    </div>
  );
}
