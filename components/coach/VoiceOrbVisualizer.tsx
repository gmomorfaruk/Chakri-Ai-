"use client";

import { useEffect, useRef } from "react";

interface VoiceOrbVisualizerProps {
  state: "idle" | "listening" | "thinking" | "speaking" | "your_turn";
  sessionStarted: boolean;
}

export function VoiceOrbVisualizer({ state, sessionStarted }: VoiceOrbVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Determine colors based on state
  const getColors = () => {
    switch (state) {
      case "listening":
      case "your_turn":
        return { primary: "rgb(34, 197, 94)", glow: "rgba(34, 197, 94, 0.3)" }; // Green
      case "speaking":
        return { primary: "rgb(59, 130, 246)", glow: "rgba(59, 130, 246, 0.3)" }; // Blue
      case "thinking":
        return { primary: "rgb(168, 85, 247)", glow: "rgba(168, 85, 247, 0.3)" }; // Purple
      default:
        return { primary: "rgb(100, 116, 139)", glow: "rgba(100, 116, 139, 0.2)" }; // Slate
    }
  };

  const colors = getColors();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "rgba(8, 12, 24, 0)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 60;
      const time = timeRef.current * 0.016; // Convert to seconds approximately

      // Breathing pulse or waveform based on state
      let pulseAmount = 0;
      let waveAmplitude = 0;

      if (state === "idle") {
        // Breathing animation when idle
        pulseAmount = Math.sin(time * 1.5) * 8 + 5;
        waveAmplitude = 0;
      } else if (state === "speaking") {
        // Waveform animation (pulsing)
        pulseAmount = 8;
        waveAmplitude = Math.sin(time * 6) * 6 + 8;
      } else if (state === "listening") {
        // Listening waveform
        pulseAmount = 5;
        waveAmplitude = (Math.sin(time * 5) + Math.cos(time * 3.7)) * 4 + 6;
      } else if (state === "thinking") {
        // Rotating pulse for thinking
        pulseAmount = Math.sin(time * 2) * 4 + 6;
        waveAmplitude = 3;
      } else {
        pulseAmount = 5;
        waveAmplitude = 4;
      }

      const currentRadius = baseRadius + pulseAmount;

      // Draw glow effect
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        currentRadius - 10,
        centerX,
        centerY,
        currentRadius + 30
      );
      glowGradient.addColorStop(0, colors.glow);
      glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform rings if speaking/listening
      if (waveAmplitude > 0) {
        for (let i = 0; i < 3; i++) {
          const ringRadius = currentRadius + 15 + i * 8;
          const alpha = Math.max(0, 0.6 - i * 0.2) * Math.abs(Math.sin(time * 4));
          ctx.strokeStyle = `rgba(${colors.primary.match(/\d+/g)?.join(", ")}, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw main orb
      const gradient = ctx.createRadialGradient(
        centerX - 15,
        centerY - 15,
        0,
        centerX,
        centerY,
        currentRadius
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
      gradient.addColorStop(0.6, colors.primary);
      gradient.addColorStop(1, colors.primary);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw waveform inside the orb if speaking/listening/thinking
      if (state !== "idle" && state !== "your_turn") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const wavePoints = 20;
        for (let i = 0; i <= wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2;
          const waveOffset =
            Math.sin(time * 5 + i * 0.3) * waveAmplitude + Math.sin(time * 3 + i * 0.5) * 2;
          const r = currentRadius * 0.7 + waveOffset;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw outer ring
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      timeRef.current++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, colors]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="relative drop-shadow-lg"
      style={{
        filter: "drop-shadow(0 0 40px currentColor)",
      }}
    />
  );
}
