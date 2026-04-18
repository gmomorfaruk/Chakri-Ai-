export type AdaptiveSignalDomain = "quiz" | "interview" | "jobs" | "recommendation";

export type AdaptiveDifficulty = "easy" | "medium" | "hard";

export interface AdaptiveSignalInput {
  domain: AdaptiveSignalDomain;
  signalType: string;
  metricValue?: number;
  payload?: Record<string, unknown>;
  source?: string;
  createdAt?: string;
}

export interface AdaptiveQuizSummary {
  attemptsIncrement?: number;
  accuracy?: number;
  topic?: string;
  weakTopics?: string[];
  strongTopics?: string[];
  targetDifficulty?: AdaptiveDifficulty;
}

export interface AdaptiveInterviewSummary {
  sessionsIncrement?: number;
  confidence?: number;
  clarity?: number;
  relevance?: number;
  mode?: "hr" | "technical" | "behavioral";
}

export interface AdaptiveJobsSummary {
  savedCount?: number;
  appliedIncrement?: number;
  matchCallsIncrement?: number;
  trackerCount?: number;
}

export interface AdaptiveSyncSummary {
  quiz?: AdaptiveQuizSummary;
  interview?: AdaptiveInterviewSummary;
  jobs?: AdaptiveJobsSummary;
  recommendations?: string[];
}

export interface AdaptiveSyncRequest {
  signals?: AdaptiveSignalInput[];
  summary?: AdaptiveSyncSummary;
}

export interface AdaptiveTopicStat {
  topic: string;
  attempts: number;
  accuracyAvg: number;
  lastAccuracy: number;
  weakMentions: number;
  strongMentions: number;
  updatedAt: string;
}

export interface AdaptiveIntelligenceProfile {
  user_id: string;
  quiz_attempts: number;
  quiz_accuracy_avg: number;
  quiz_last_topic: string | null;
  quiz_topic_stats: Record<string, AdaptiveTopicStat>;
  interview_sessions: number;
  interview_avg_confidence: number;
  interview_avg_clarity: number;
  interview_avg_relevance: number;
  jobs_saved_count: number;
  jobs_applied_count: number;
  jobs_match_calls: number;
  recommendation_signals: string[];
  recommendation_score: number;
  last_quiz_at: string | null;
  last_interview_at: string | null;
  last_jobs_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdaptiveContextTopicWeight {
  topic: string;
  accuracy: number;
  attempts: number;
}

export interface AdaptiveContextFromCloud {
  weakTopics: AdaptiveContextTopicWeight[];
  strongTopics: AdaptiveContextTopicWeight[];
  focusConcepts: string[];
  targetDifficulty: AdaptiveDifficulty;
  recommendations: string[];
}

export interface AdaptiveSyncResponse {
  profile: AdaptiveIntelligenceProfile;
  recommendations: string[];
  context: AdaptiveContextFromCloud;
}
