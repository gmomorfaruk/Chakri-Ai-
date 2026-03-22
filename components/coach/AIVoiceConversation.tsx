"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { CoachMode } from "@/types/coach";
import { VoiceOrbVisualizer } from "./VoiceOrbVisualizer";
import { VoiceTranscriptBubbles } from "./VoiceTranscriptBubbles";
import { VoiceFeedbackPanel } from "./VoiceFeedbackPanel";
import { VoiceControlBar } from "./VoiceControlBar";

type ConversationState = "idle" | "listening" | "thinking" | "speaking" | "your_turn";

interface VoiceMessage {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "হ্যাঁ",
  "মানে",
  "এই",
  "উম",
];

const OPENING_QUESTIONS = {
  hr: "Tell me about yourself and your professional background.",
  technical: "Can you explain your most recent project and the technologies you used?",
  behavioral: "Describe a situation where you had to handle conflict in the workplace.",
};

export function AIVoiceConversation({ mode }: { mode: CoachMode }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<ConversationState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [confidence, setConfidence] = useState(100);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<Map<string, SpeechSynthesisUtterance>>(new Map());
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const hasSpeechRecognition = Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
    const hasSpeechSynthesis = Boolean((window as any).speechSynthesis);
    setSupported(hasSpeechRecognition && hasSpeechSynthesis);
  }, []);

  // Session timer
  useEffect(() => {
    if (sessionStarted) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
      return () => {
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      };
    }
  }, [sessionStarted]);

  // Count filler words in live transcript
  useEffect(() => {
    const text = liveTranscript.toLowerCase();
    const total = FILLER_WORDS.reduce((acc, word) => {
      const regex = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "gi");
      const matches = text.match(regex);
      return acc + (matches?.length ?? 0);
    }, 0);

    setFillerCount(total);
    const conf = Math.max(0, 100 - total * 6);
    setConfidence(conf);
  }, [liveTranscript]);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";

    recognition.onstart = () => {
      setState("listening");
      setLiveTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setLiveTranscript((finalTranscript + interimTranscript).trim());
    };

    recognition.onerror = () => {
      setState("idle");
    };

    recognition.onend = () => {
      if (liveTranscript.trim() && !isProcessingRef.current) {
        isProcessingRef.current = true;
        handleUserSpeechEnd(liveTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [lang, liveTranscript]);

  // Handle user speech end - send to AI and get response
  const handleUserSpeechEnd = useCallback(
    async (transcript: string) => {
      setState("thinking");

      // Add user message to transcript
      setMessages((prev) => [
        ...prev,
        { role: "user", text: transcript, timestamp: Date.now() },
      ]);
      setLiveTranscript("");

      try {
        // Build conversation history
        const history = messages.map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

        // Get AI response
        const res = await fetch("/api/coach/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            message: transcript,
            history,
          }),
        });

        if (!res.ok) throw new Error("Failed to get response");

        const data = (await res.json()) as { reply?: string };
        const reply = data.reply?.trim() || "I didn't understand that. Could you repeat?";

        // Add AI message to transcript
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: reply, timestamp: Date.now() },
        ]);

        // Speak the AI response
        setState("speaking");
        await speakText(reply);

        // AI finished speaking, wait for user's turn
        setState("your_turn");
        startListening();
      } catch (error) {
        console.error("Error getting AI response:", error);
        setState("your_turn");
        startListening();
      } finally {
        isProcessingRef.current = false;
      }
    },
    [messages, mode]
  );

  // Text to speech
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!(window as any).speechSynthesis) {
        resolve();
        return;
      }

      (window as any).speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
      utterance.rate = 0.96;
      utterance.pitch = 1;

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = () => {
        resolve();
      };

      (window as any).speechSynthesis.speak(utterance);
    });
  };

  // Start listening for user
  const startListening = () => {
    const recognition = recognitionRef.current || initRecognition();
    if (!recognition) return;

    try {
      recognition.start();
    } catch (e) {
      // Recognition already started
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Start interview session
  const handleStartSession = useCallback(async () => {
    setSessionStarted(true);
    setMessages([]);
    setLiveTranscript("");
    setState("speaking");

    // AI speaks first question
    const openingQuestion =
      OPENING_QUESTIONS[mode as keyof typeof OPENING_QUESTIONS];
    setMessages([{ role: "ai", text: openingQuestion, timestamp: Date.now() }]);

    await speakText(openingQuestion);

    // Wait for user response
    setState("your_turn");
    startListening();
  }, [mode]);

  // End session
  const handleEndSession = () => {
    stopListening();
    (window as any).speechSynthesis?.cancel();
    setSessionStarted(false);
    setState("idle");
    setMessages([]);
    setLiveTranscript("");
    setSessionTime(0);
    setFillerCount(0);
  };

  // Handle main mic button click
  const handleMicClick = () => {
    if (!supported) return;

    if (!sessionStarted) {
      handleStartSession();
    } else if (state === "your_turn" || state === "idle") {
      setState("listening");
      startListening();
    } else if (state === "listening") {
      stopListening();
    }
  };

  if (!supported) {
    return (
      <section className="flex h-full min-h-0 items-center justify-center bg-gradient-to-b from-[#080c18] via-[#0a0f1e] to-[#0d1117] p-4">
        <p className="text-sm text-muted-foreground">
          Voice features require a modern browser with speech recognition and synthesis support.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full overflow-hidden bg-gradient-to-b from-[#080c18] via-[#0a0f1e] to-[#0d1117]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-6 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 md:p-8">
        {/* Header */}
        {sessionStarted && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white capitalize">{mode} Interview</h2>
              <p className="text-sm text-slate-400">
                {Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, "0")}
              </p>
            </div>
            <button
              onClick={handleEndSession}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 transition-colors"
            >
              End Session
            </button>
          </div>
        )}

        {/* Voice Orb Visualizer */}
        <div className="flex justify-center py-8">
          <VoiceOrbVisualizer state={state} sessionStarted={sessionStarted} />
        </div>

        {/* State Display */}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300 capitalize">
            {state === "idle" && "Ready to start"}
            {state === "listening" && "Listening..."}
            {state === "thinking" && "AI is thinking..."}
            {state === "speaking" && "AI is speaking..."}
            {state === "your_turn" && "Your turn to speak"}
          </p>
        </div>

        {/* Transcript bubbles */}
        {sessionStarted && (
          <div className="max-h-64 overflow-y-auto rounded-xl bg-black/30 backdrop-blur-sm p-4">
            <VoiceTranscriptBubbles messages={messages} liveTranscript={liveTranscript} />
          </div>
        )}

        {/* Main control button */}
        <div className="flex justify-center">
          <VoiceControlBar
            state={state}
            sessionStarted={sessionStarted}
            onMicClick={handleMicClick}
          />
        </div>

        {/* Feedback panel */}
        {sessionStarted && <VoiceFeedbackPanel fillerCount={fillerCount} confidence={confidence} />}

        {/* Info */}
        {!sessionStarted && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-4 text-center">
            <p className="text-sm text-slate-300">
              {t("voiceHint") || "Click the microphone button to begin your AI interview"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
