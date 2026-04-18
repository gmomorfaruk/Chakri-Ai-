import {
  AdaptiveContextFromCloud,
  AdaptiveDifficulty,
  AdaptiveIntelligenceProfile,
  AdaptiveTopicStat,
} from "@/types/adaptiveIntelligence";

function toTopicList(topicStats: Record<string, AdaptiveTopicStat>) {
  return Object.values(topicStats).filter((item) => item.attempts > 0);
}

export function deriveCloudDifficulty(profile: AdaptiveIntelligenceProfile): AdaptiveDifficulty {
  if (profile.quiz_accuracy_avg > 80) return "hard";
  if (profile.quiz_accuracy_avg < 50) return "easy";
  return "medium";
}

export function deriveCloudRecommendations(profile: AdaptiveIntelligenceProfile) {
  const recommendations: string[] = [];

  const topics = toTopicList(profile.quiz_topic_stats);
  const weakest = [...topics].sort((a, b) => a.accuracyAvg - b.accuracyAvg)[0];
  const strongest = [...topics].sort((a, b) => b.accuracyAvg - a.accuracyAvg)[0];

  if (weakest && weakest.accuracyAvg < 65) {
    recommendations.push(`You should focus on ${weakest.topic} today.`);
  }

  if (profile.interview_sessions > 0 && profile.interview_avg_clarity < 60) {
    recommendations.push("Interview clarity is low. Use concise STAR answers with one measurable result.");
  }

  if (profile.jobs_saved_count > 0 && profile.jobs_applied_count === 0) {
    recommendations.push("You have saved jobs but no applications yet. Submit at least one application today.");
  }

  if (profile.jobs_match_calls === 0) {
    recommendations.push("Run smart job matching to discover roles aligned to your current skills.");
  }

  const difficulty = deriveCloudDifficulty(profile);
  if (difficulty === "hard") {
    recommendations.push("Your quiz performance is strong. Move to hard-level challenge questions.");
  } else if (difficulty === "easy") {
    recommendations.push("Reinforce fundamentals with easier quizzes before increasing difficulty.");
  }

  if (strongest && strongest.accuracyAvg >= 80) {
    recommendations.push(`Strong area maintained: ${strongest.topic}. Keep this as revision-only.`);
  }

  profile.recommendation_signals.forEach((item) => {
    if (typeof item === "string" && item.trim()) {
      recommendations.push(item.trim());
    }
  });

  if (recommendations.length === 0) {
    recommendations.push("Complete one quiz, one interview, and one job action to unlock richer recommendations.");
  }

  return Array.from(new Set(recommendations)).slice(0, 6);
}

export function buildCloudAdaptiveContext(profile: AdaptiveIntelligenceProfile): AdaptiveContextFromCloud {
  const topics = toTopicList(profile.quiz_topic_stats);

  const weakTopics = topics
    .filter((item) => item.accuracyAvg < 65)
    .sort((a, b) => a.accuracyAvg - b.accuracyAvg || b.attempts - a.attempts)
    .slice(0, 5)
    .map((item) => ({
      topic: item.topic,
      accuracy: item.accuracyAvg,
      attempts: item.attempts,
    }));

  const strongTopics = topics
    .filter((item) => item.accuracyAvg >= 80)
    .sort((a, b) => b.accuracyAvg - a.accuracyAvg)
    .slice(0, 4)
    .map((item) => ({
      topic: item.topic,
      accuracy: item.accuracyAvg,
      attempts: item.attempts,
    }));

  const focusConcepts = weakTopics.map((item) => item.topic);

  return {
    weakTopics,
    strongTopics,
    focusConcepts,
    targetDifficulty: deriveCloudDifficulty(profile),
    recommendations: deriveCloudRecommendations(profile),
  };
}
