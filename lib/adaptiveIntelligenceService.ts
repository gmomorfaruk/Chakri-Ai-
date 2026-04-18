import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdaptiveIntelligenceProfile,
  AdaptiveSignalInput,
  AdaptiveSyncRequest,
  AdaptiveSyncResponse,
  AdaptiveTopicStat,
} from "@/types/adaptiveIntelligence";
import { buildCloudAdaptiveContext, deriveCloudRecommendations } from "@/lib/adaptiveIntelligenceShared";

const MAX_RECOMMENDATIONS = 12;
const MAX_TOPIC_STATS = 30;

function nowIso() {
  return new Date().toISOString();
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeTopic(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function preserveTopicLabel(topic: string) {
  return topic.trim().replace(/\s+/g, " ");
}

function nextAverage(currentAverage: number, currentCount: number, incomingValue: number, increment = 1) {
  if (!Number.isFinite(incomingValue) || increment <= 0) {
    return currentAverage;
  }

  const weightedCurrent = currentAverage * currentCount;
  const weightedIncoming = incomingValue * increment;
  const nextCount = currentCount + increment;
  return nextCount > 0 ? (weightedCurrent + weightedIncoming) / nextCount : currentAverage;
}

function sanitizeRecommendations(input: string[]) {
  return Array.from(
    new Set(
      input
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_RECOMMENDATIONS);
}

function emptyProfile(userId: string): AdaptiveIntelligenceProfile {
  const now = nowIso();
  return {
    user_id: userId,
    quiz_attempts: 0,
    quiz_accuracy_avg: 0,
    quiz_last_topic: null,
    quiz_topic_stats: {},
    interview_sessions: 0,
    interview_avg_confidence: 0,
    interview_avg_clarity: 0,
    interview_avg_relevance: 0,
    jobs_saved_count: 0,
    jobs_applied_count: 0,
    jobs_match_calls: 0,
    recommendation_signals: [],
    recommendation_score: 0,
    last_quiz_at: null,
    last_interview_at: null,
    last_jobs_at: null,
    created_at: now,
    updated_at: now,
  };
}

function sanitizeTopicStats(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return {} as Record<string, AdaptiveTopicStat>;
  }

  const records = raw as Record<string, AdaptiveTopicStat>;
  const output: Record<string, AdaptiveTopicStat> = {};

  Object.entries(records).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;

    const topic = typeof value.topic === "string" && value.topic.trim() ? preserveTopicLabel(value.topic) : preserveTopicLabel(key);
    const topicKey = normalizeTopic(topic) || key;

    output[topicKey] = {
      topic,
      attempts: Number.isFinite(value.attempts) ? Math.max(0, Math.round(value.attempts)) : 0,
      accuracyAvg: Number.isFinite(value.accuracyAvg) ? clampPercent(value.accuracyAvg) : 0,
      lastAccuracy: Number.isFinite(value.lastAccuracy) ? clampPercent(value.lastAccuracy) : 0,
      weakMentions: Number.isFinite(value.weakMentions) ? Math.max(0, Math.round(value.weakMentions)) : 0,
      strongMentions: Number.isFinite(value.strongMentions) ? Math.max(0, Math.round(value.strongMentions)) : 0,
      updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : nowIso(),
    };
  });

  return output;
}

function sanitizeProfile(raw: any, userId: string): AdaptiveIntelligenceProfile {
  const base = emptyProfile(userId);
  if (!raw || typeof raw !== "object") {
    return base;
  }

  return {
    ...base,
    ...raw,
    user_id: userId,
    quiz_attempts: Number.isFinite(raw.quiz_attempts) ? Math.max(0, Math.round(raw.quiz_attempts)) : 0,
    quiz_accuracy_avg: Number.isFinite(raw.quiz_accuracy_avg) ? clampPercent(raw.quiz_accuracy_avg) : 0,
    quiz_last_topic: typeof raw.quiz_last_topic === "string" && raw.quiz_last_topic.trim() ? raw.quiz_last_topic.trim() : null,
    quiz_topic_stats: sanitizeTopicStats(raw.quiz_topic_stats),
    interview_sessions: Number.isFinite(raw.interview_sessions) ? Math.max(0, Math.round(raw.interview_sessions)) : 0,
    interview_avg_confidence: Number.isFinite(raw.interview_avg_confidence) ? clampPercent(raw.interview_avg_confidence) : 0,
    interview_avg_clarity: Number.isFinite(raw.interview_avg_clarity) ? clampPercent(raw.interview_avg_clarity) : 0,
    interview_avg_relevance: Number.isFinite(raw.interview_avg_relevance) ? clampPercent(raw.interview_avg_relevance) : 0,
    jobs_saved_count: Number.isFinite(raw.jobs_saved_count) ? Math.max(0, Math.round(raw.jobs_saved_count)) : 0,
    jobs_applied_count: Number.isFinite(raw.jobs_applied_count) ? Math.max(0, Math.round(raw.jobs_applied_count)) : 0,
    jobs_match_calls: Number.isFinite(raw.jobs_match_calls) ? Math.max(0, Math.round(raw.jobs_match_calls)) : 0,
    recommendation_signals: Array.isArray(raw.recommendation_signals)
      ? raw.recommendation_signals.filter((item: unknown): item is string => typeof item === "string")
      : [],
    recommendation_score: Number.isFinite(raw.recommendation_score) ? clampPercent(raw.recommendation_score) : 0,
    last_quiz_at: typeof raw.last_quiz_at === "string" && raw.last_quiz_at ? raw.last_quiz_at : null,
    last_interview_at: typeof raw.last_interview_at === "string" && raw.last_interview_at ? raw.last_interview_at : null,
    last_jobs_at: typeof raw.last_jobs_at === "string" && raw.last_jobs_at ? raw.last_jobs_at : null,
    created_at: typeof raw.created_at === "string" && raw.created_at ? raw.created_at : base.created_at,
    updated_at: typeof raw.updated_at === "string" && raw.updated_at ? raw.updated_at : base.updated_at,
  };
}

function updateTopicStats(profile: AdaptiveIntelligenceProfile, summary: NonNullable<AdaptiveSyncRequest["summary"]>) {
  if (!summary.quiz) {
    return profile.quiz_topic_stats;
  }

  const topicStats = { ...profile.quiz_topic_stats };
  const topic = summary.quiz.topic?.trim();
  if (!topic) {
    return topicStats;
  }

  const topicLabel = preserveTopicLabel(topic);
  const topicKey = normalizeTopic(topicLabel);
  if (!topicKey) return topicStats;

  const existing = topicStats[topicKey] || {
    topic: topicLabel,
    attempts: 0,
    accuracyAvg: 0,
    lastAccuracy: 0,
    weakMentions: 0,
    strongMentions: 0,
    updatedAt: nowIso(),
  };

  const attemptsIncrement = Math.max(1, summary.quiz.attemptsIncrement ?? 1);
  const accuracy = Number.isFinite(summary.quiz.accuracy) ? clampPercent(summary.quiz.accuracy as number) : existing.lastAccuracy;

  const weakMentionsIncrement = Array.isArray(summary.quiz.weakTopics)
    ? summary.quiz.weakTopics.filter((item) => normalizeTopic(item || "") === topicKey).length
    : 0;

  const strongMentionsIncrement = Array.isArray(summary.quiz.strongTopics)
    ? summary.quiz.strongTopics.filter((item) => normalizeTopic(item || "") === topicKey).length
    : 0;

  topicStats[topicKey] = {
    topic: topicLabel,
    attempts: existing.attempts + attemptsIncrement,
    accuracyAvg: nextAverage(existing.accuracyAvg, existing.attempts, accuracy, attemptsIncrement),
    lastAccuracy: accuracy,
    weakMentions: existing.weakMentions + weakMentionsIncrement,
    strongMentions: existing.strongMentions + strongMentionsIncrement,
    updatedAt: nowIso(),
  };

  const sortedKeys = Object.keys(topicStats).sort((a, b) => {
    const aTs = Date.parse(topicStats[a].updatedAt) || 0;
    const bTs = Date.parse(topicStats[b].updatedAt) || 0;
    return bTs - aTs;
  });

  if (sortedKeys.length > MAX_TOPIC_STATS) {
    sortedKeys.slice(MAX_TOPIC_STATS).forEach((key) => {
      delete topicStats[key];
    });
  }

  return topicStats;
}

function applySummaryToProfile(profile: AdaptiveIntelligenceProfile, summary?: AdaptiveSyncRequest["summary"]) {
  if (!summary) {
    return profile;
  }

  let next = { ...profile };

  if (summary.quiz) {
    const attemptsIncrement = Math.max(1, summary.quiz.attemptsIncrement ?? 1);
    const incomingAccuracy = Number.isFinite(summary.quiz.accuracy) ? clampPercent(summary.quiz.accuracy as number) : next.quiz_accuracy_avg;

    next = {
      ...next,
      quiz_attempts: next.quiz_attempts + attemptsIncrement,
      quiz_accuracy_avg: nextAverage(next.quiz_accuracy_avg, next.quiz_attempts, incomingAccuracy, attemptsIncrement),
      quiz_last_topic: summary.quiz.topic?.trim() || next.quiz_last_topic,
      quiz_topic_stats: updateTopicStats(next, summary),
      last_quiz_at: nowIso(),
    };
  }

  if (summary.interview) {
    const sessionsIncrement = Math.max(1, summary.interview.sessionsIncrement ?? 1);
    const confidence = Number.isFinite(summary.interview.confidence) ? clampPercent(summary.interview.confidence as number) : next.interview_avg_confidence;
    const clarity = Number.isFinite(summary.interview.clarity) ? clampPercent(summary.interview.clarity as number) : next.interview_avg_clarity;
    const relevance = Number.isFinite(summary.interview.relevance) ? clampPercent(summary.interview.relevance as number) : next.interview_avg_relevance;

    next = {
      ...next,
      interview_sessions: next.interview_sessions + sessionsIncrement,
      interview_avg_confidence: nextAverage(next.interview_avg_confidence, next.interview_sessions, confidence, sessionsIncrement),
      interview_avg_clarity: nextAverage(next.interview_avg_clarity, next.interview_sessions, clarity, sessionsIncrement),
      interview_avg_relevance: nextAverage(next.interview_avg_relevance, next.interview_sessions, relevance, sessionsIncrement),
      last_interview_at: nowIso(),
    };
  }

  if (summary.jobs) {
    next = {
      ...next,
      jobs_saved_count: Number.isFinite(summary.jobs.savedCount)
        ? Math.max(next.jobs_saved_count, Math.round(summary.jobs.savedCount as number))
        : next.jobs_saved_count,
      jobs_applied_count: next.jobs_applied_count + Math.max(0, Math.round(summary.jobs.appliedIncrement ?? 0)),
      jobs_match_calls: next.jobs_match_calls + Math.max(0, Math.round(summary.jobs.matchCallsIncrement ?? 0)),
      last_jobs_at: nowIso(),
    };
  }

  if (summary.recommendations && summary.recommendations.length > 0) {
    next = {
      ...next,
      recommendation_signals: sanitizeRecommendations([...next.recommendation_signals, ...summary.recommendations]),
    };
  }

  const derivedRecommendations = deriveCloudRecommendations(next);
  next = {
    ...next,
    recommendation_signals: sanitizeRecommendations([...next.recommendation_signals, ...derivedRecommendations]),
    recommendation_score: clampPercent(Math.round((next.quiz_accuracy_avg + next.interview_avg_confidence + next.interview_avg_clarity) / 3)),
    updated_at: nowIso(),
  };

  return next;
}

export async function getAdaptiveProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("adaptive_user_intelligence")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ? sanitizeProfile(data, userId) : null,
    error: null,
  };
}

export async function insertAdaptiveSignals(supabase: SupabaseClient, userId: string, signals: AdaptiveSignalInput[]) {
  if (signals.length === 0) {
    return { error: null };
  }

  const rows = signals.map((signal) => ({
    user_id: userId,
    domain: signal.domain,
    signal_type: signal.signalType,
    metric_value: Number.isFinite(signal.metricValue) ? signal.metricValue : null,
    payload: signal.payload ?? {},
    source: signal.source ?? "app",
    created_at: signal.createdAt ?? nowIso(),
  }));

  const { error } = await supabase.from("adaptive_user_signals").insert(rows);
  return { error };
}

export async function saveAdaptiveProfile(supabase: SupabaseClient, profile: AdaptiveIntelligenceProfile) {
  const { data, error } = await supabase
    .from("adaptive_user_intelligence")
    .upsert(profile, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return { data: null, error };
  }

  return {
    data: sanitizeProfile(data, profile.user_id),
    error: null,
  };
}

export async function syncAdaptiveIntelligence(
  supabase: SupabaseClient,
  userId: string,
  payload: AdaptiveSyncRequest
): Promise<{ data: AdaptiveSyncResponse | null; error: Error | null }> {
  const existingRes = await getAdaptiveProfile(supabase, userId);
  if (existingRes.error) {
    return {
      data: null,
      error: new Error(existingRes.error.message),
    };
  }

  const baseline = existingRes.data ?? emptyProfile(userId);

  if (payload.signals && payload.signals.length > 0) {
    const signalRes = await insertAdaptiveSignals(supabase, userId, payload.signals);
    if (signalRes.error) {
      return {
        data: null,
        error: new Error(signalRes.error.message),
      };
    }
  }

  const nextProfile = applySummaryToProfile(baseline, payload.summary);
  const savedRes = await saveAdaptiveProfile(supabase, nextProfile);
  if (savedRes.error || !savedRes.data) {
    return {
      data: null,
      error: new Error(savedRes.error?.message || "Failed to save adaptive profile"),
    };
  }

  const context = buildCloudAdaptiveContext(savedRes.data);
  const recommendations = context.recommendations;

  return {
    data: {
      profile: savedRes.data,
      recommendations,
      context,
    },
    error: null,
  };
}

export async function readAdaptiveIntelligence(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: AdaptiveSyncResponse | null; error: Error | null }> {
  const existingRes = await getAdaptiveProfile(supabase, userId);
  if (existingRes.error) {
    return {
      data: null,
      error: new Error(existingRes.error.message),
    };
  }

  const profile = existingRes.data ?? emptyProfile(userId);
  const context = buildCloudAdaptiveContext(profile);

  if (!existingRes.data) {
    const savedRes = await saveAdaptiveProfile(supabase, profile);
    if (savedRes.error || !savedRes.data) {
      return {
        data: null,
        error: new Error(savedRes.error?.message || "Failed to initialize adaptive profile"),
      };
    }

    return {
      data: {
        profile: savedRes.data,
        recommendations: context.recommendations,
        context,
      },
      error: null,
    };
  }

  return {
    data: {
      profile,
      recommendations: context.recommendations,
      context,
    },
    error: null,
  };
}
