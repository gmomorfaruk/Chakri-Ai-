"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { CoachMode } from "@/types/coach";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically", "মানে", "এই", "উম"];

export function VoiceVivaPanel({ mode }: { mode: CoachMode }) {
  const { t, lang } = useI18n();

  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [status, setStatus] = useState<string>("");

  const recognitionRef = useRef<any>(null);

  function ensureSupport() {
    const ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const ok = Boolean(ctor) && typeof (window as any).speechSynthesis !== "undefined";
    setSupported(ok);
    return { ok, ctor };
  }

  function startListening() {
    const { ok, ctor } = ensureSupport();
    if (!ok || !ctor) {
      setStatus(t("voiceUnsupported"));
      return;
    }

    if (listening) return;

    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";

    recognition.onstart = () => {
      setListening(true);
      setStatus(t("voiceListening"));
    };

    recognition.onresult = (event: any) => {
      let full = "";
      for (let i = 0; i < event.results.length; i += 1) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full.trim());
    };

    recognition.onerror = (event: any) => {
      const err = String(event.error || "unknown");
      if (err === "not-allowed" || err === "service-not-allowed") {
        setStatus(t("voicePermissionDenied"));
      } else {
        setStatus(`${t("voiceError")}: ${err}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setStatus((prev) => (prev === t("voiceListening") ? t("voiceStopped") : prev));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    setStatus(t("voiceStopped"));
  }

  async function sendTranscript() {
    if (!transcript.trim()) {
      setStatus(t("voiceTranscriptRequired"));
      return;
    }

    setStatus(t("coachThinking"));
    const res = await fetch("/api/coach/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message: transcript.trim(), history: [] }),
    });

    if (!res.ok) {
      setStatus(t("coachAiFailed"));
      return;
    }

    const data = (await res.json()) as { reply?: string };
    const reply = data.reply?.trim() || t("coachDefaultReply");
    setLastReply(reply);
    setStatus(t("voiceReady"));
    speak(reply);
  }

  function speak(text: string) {
    if (!(window as any).speechSynthesis) {
      setStatus(t("voiceUnsupported"));
      return;
    }

    (window as any).speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
      setStatus(t("voiceSpeaking"));
    };
    utterance.onend = () => {
      setSpeaking(false);
      setStatus(t("voiceReady"));
    };

    (window as any).speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (!(window as any).speechSynthesis) return;
    (window as any).speechSynthesis.cancel();
    setSpeaking(false);
    setStatus(t("voiceStopped"));
  }

  const fillerStats = useMemo(() => {
    const text = transcript.toLowerCase();
    const total = FILLER_WORDS.reduce((acc, word) => {
      const regex = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "gi");
      const matches = text.match(regex);
      return acc + (matches?.length ?? 0);
    }, 0);

    const confidence = Math.max(0, 100 - total * 6);
    return { total, confidence };
  }, [transcript]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">{t("voiceVivaPractice")}</h2>
      <p className="text-sm text-muted-foreground">{t("voiceHint")}</p>

      <div className="flex flex-wrap gap-2">
        <button onClick={startListening} disabled={listening} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60">
          {t("voiceStart")}
        </button>
        <button onClick={stopListening} disabled={!listening} className="rounded-lg border border-border px-3 py-2 disabled:opacity-60">
          {t("voiceStop")}
        </button>
        <button onClick={stopSpeaking} disabled={!speaking} className="rounded-lg border border-border px-3 py-2 disabled:opacity-60">
          {t("voiceStopSpeaking") ?? "Stop AI Voice"}
        </button>
        <button onClick={sendTranscript} className="rounded-lg border border-border px-3 py-2">
          {t("sendToCoach")}
        </button>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("micStatus")}</p>
        <p className="mt-1 text-sm">
          {supported === false ? t("voiceUnsupported") : listening ? t("voiceListening") : speaking ? t("voiceSpeaking") : status || t("voiceReady")}
        </p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("transcript")}</p>
        <p className="mt-1 min-h-10 whitespace-pre-wrap text-sm text-muted-foreground">{transcript || t("emptyTranscript")}</p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("coachAssistant")}</p>
        <p className="mt-1 min-h-10 whitespace-pre-wrap text-sm text-muted-foreground">{lastReply || t("emptyVoiceReply")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("fillerWords")}</p>
          <p className="mt-1 text-sm">{fillerStats.total}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("confidenceEstimate")}</p>
          <p className="mt-1 text-sm">{fillerStats.confidence}%</p>
        </div>
      </div>
    </section>
  );
}
