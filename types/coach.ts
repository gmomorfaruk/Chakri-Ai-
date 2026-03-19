export type CoachMode = "hr" | "technical" | "behavioral";
export type CoachMessageRole = "user" | "assistant" | "system";

export interface CoachSession {
  id: string;
  user_id: string;
  mode: CoachMode;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: CoachMessageRole;
  content: string;
  created_at: string;
}

export interface CoachEvaluation {
  id: string;
  session_id: string;
  user_id: string;
  answer_clarity_score: number;
  confidence_score: number;
  relevance_score: number;
  feedback: string | null;
  created_at: string;
}
