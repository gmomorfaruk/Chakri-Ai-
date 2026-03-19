import { SupabaseClient } from "@supabase/supabase-js";
import { CoachEvaluation, CoachMessage, CoachMode, CoachSession } from "@/types/coach";

export async function createCoachSession(
  supabase: SupabaseClient,
  payload: Pick<CoachSession, "user_id" | "mode" | "title">
) {
  return supabase.from("coach_sessions").insert(payload).select("*").single();
}

export async function getCoachSessions(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("coach_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .returns<CoachSession[]>();
}

export async function getCoachMessages(supabase: SupabaseClient, sessionId: string) {
  return supabase
    .from("coach_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<CoachMessage[]>();
}

export async function addCoachMessage(
  supabase: SupabaseClient,
  payload: Pick<CoachMessage, "session_id" | "user_id" | "role" | "content">
) {
  return supabase.from("coach_messages").insert(payload).select("*").single();
}

export async function addCoachEvaluation(
  supabase: SupabaseClient,
  payload: Pick<CoachEvaluation, "session_id" | "user_id" | "answer_clarity_score" | "confidence_score" | "relevance_score" | "feedback">
) {
  return supabase.from("coach_evaluations").insert(payload).select("*").single();
}

export async function getLatestCoachEvaluation(supabase: SupabaseClient, sessionId: string) {
  return supabase
    .from("coach_evaluations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CoachEvaluation>();
}

export function generateSessionTitle(mode: CoachMode, firstPrompt: string): string {
  const prefix = mode === "technical" ? "Technical" : mode === "behavioral" ? "Behavioral" : "HR";
  const core = firstPrompt.trim().slice(0, 36);
  return core ? `${prefix}: ${core}` : `${prefix} Session`;
}

export function localEvaluateAnswer(answer: string) {
  const normalized = answer.trim();
  const length = normalized.length;
  const clarity = Math.min(100, Math.max(25, Math.round(length * 0.5)));
  const confidenceBoost = /\b(led|delivered|built|improved|achieved|solved|designed|implemented)\b/i.test(normalized) ? 15 : 0;
  const relevanceBoost = /\b(project|team|result|impact|metric|deadline|customer)\b/i.test(normalized) ? 15 : 0;

  const confidence = Math.min(100, 45 + confidenceBoost + Math.round(length * 0.25));
  const relevance = Math.min(100, 45 + relevanceBoost + Math.round(length * 0.2));

  const feedback = [
    "Use STAR structure (Situation, Task, Action, Result) for stronger answers.",
    "Add one measurable outcome to increase credibility.",
    "Keep your answer concise and role-focused.",
  ].join(" ");

  return {
    answer_clarity_score: clarity,
    confidence_score: confidence,
    relevance_score: relevance,
    feedback,
  };
}
