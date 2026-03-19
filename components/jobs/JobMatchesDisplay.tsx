"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Zap, Target, MapPin, Briefcase, TrendingUp } from "lucide-react";

interface MatchedJob {
  id: string;
  job_id: string;
  title: string;
  company: string;
  location: string | null;
  score: number;
  skill_score: number;
  role_score: number;
  location_score: number;
  experience_score: number;
  matched_skills: string[];
  missing_skills: string[];
  created_at: string;
}

interface JobMatchesDisplayProps {
  refreshTrigger?: number;
  onError?: (message: string | null) => void;
}

export function JobMatchesDisplay({ refreshTrigger = 0, onError }: JobMatchesDisplayProps) {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing matches
  async function loadMatches() {
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(t("profileAuthRequired"));
        setLoading(false);
        return;
      }

      const response = await fetch("/api/jobs/match?limit=10", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load matches");
        return;
      }

      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  // Compute/recompute matches
  async function computeMatches() {
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      return;
    }

    setComputing(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(t("profileAuthRequired"));
        setComputing(false);
        return;
      }

      const response = await fetch("/api/jobs/match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to compute matches");
        return;
      }

      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute matches");
    } finally {
      setComputing(false);
    }
  }

  useEffect(() => {
    void loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, refreshTrigger]);

  useEffect(() => {
    if (onError) {
      onError(error);
    }
  }, [error, onError]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-green-500/10 border-green-500/30";
    if (score >= 60) return "bg-blue-500/10 border-blue-500/30";
    if (score >= 40) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Zap className="h-6 w-6 text-primary" />
              Top Job Matches
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalized job recommendations based on your skills and preferences
            </p>
          </div>
          <button
            onClick={computeMatches}
            disabled={computing}
            className="relative group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-base overflow-hidden transition-all duration-300 disabled:opacity-60 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {computing ? "Computing..." : "Find Matches"}
            </span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl border border-border/50 bg-card/50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Matches List */}
      {!loading && matches.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border/50 p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            No matches found yet. Click "Find Matches" to compute your personalized recommendations.
          </p>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.job_id}
              className={`group rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/50 ${getScoreBgColor(match.score)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{match.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium">{match.company}</span>
                    {match.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {match.location}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Badge */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl p-4 ${getScoreBgColor(match.score)}`}
                >
                  <span className={`text-3xl font-bold ${getScoreColor(match.score)}`}>
                    {match.score}%
                  </span>
                  <span className="text-xs text-muted-foreground font-medium mt-1">Match</span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mt-5 grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Skills</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{match.skill_score}%</div>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Role</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{match.role_score}%</div>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Location</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{match.location_score}%</div>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Experience</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{match.experience_score}%</div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* Matched Skills */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    MATCHED SKILLS ({match.matched_skills.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {match.matched_skills.length > 0 ? (
                      match.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 text-xs font-medium text-green-600 dark:text-green-400"
                        >
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    MISSING SKILLS ({match.missing_skills.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {match.missing_skills.length > 0 ? (
                      match.missing_skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-xs font-medium text-amber-600 dark:text-amber-400"
                        >
                          ⓘ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None - Perfect match!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex gap-3">
                <button className="flex-1 relative group px-4 py-2.5 rounded-lg font-semibold text-sm overflow-hidden transition-all duration-300 text-white">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent group-hover:shadow-lg group-hover:shadow-primary/30 transition-all" />
                  <span className="relative">Apply Now</span>
                </button>
                <button className="flex-1 px-4 py-2.5 rounded-lg border-2 border-primary/30 font-semibold text-sm text-primary hover:bg-primary/5 transition-all duration-300">
                  Save Job
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {!loading && matches.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4 text-center text-sm text-muted-foreground">
          Showing top {matches.length} matches out of {matches.length} · Last updated:{" "}
          {matches[0]?.created_at
            ? new Date(matches[0].created_at).toLocaleDateString()
            : "Never"}
        </div>
      )}
    </div>
  );
}
