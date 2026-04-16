"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useI18n } from "@/components/providers/I18nProvider";

type ScoreFilter = "all" | "strong" | "good";
type LocationFilter = "all" | "remote" | "local";

interface MatchedJob {
  id: string;
  job_id: string;
  title: string;
  company: string;
  location: string | null;
  source_url?: string | null;
  apply_url?: string | null;
  url?: string | null;
  score: number;
  skill_score: number;
  role_score: number;
  location_score: number;
  experience_score: number;
  matched_skills: string[];
  missing_skills: string[];
  created_at: string;
  experience_label?: string;
  salary_label?: string;
  remote?: boolean;
}

interface JobMatchesDisplayProps {
  refreshTrigger?: number;
  onError?: (message: string | null) => void;
}

const palette = {
  bg: "#0d1117",
  card: "#161b22",
  cardAlt: "#1c2128",
  border: "#30363d",
  blue: "#58a6ff",
  green: "#3fb950",
  amber: "#f0b429",
  red: "#f85149",
  textSubtle: "#9ba6b5",
};

const sampleMatches: MatchedJob[] = [
  {
    id: "sample-1",
    job_id: "sample-1",
    title: "Senior Frontend Engineer",
    company: "DeltaPay",
    location: "Dhaka, BD",
    score: 82,
    skill_score: 84,
    role_score: 80,
    location_score: 72,
    experience_score: 85,
    matched_skills: ["React", "TypeScript", "GraphQL", "CSS"],
    missing_skills: ["Next.js"],
    created_at: new Date().toISOString(),
    experience_label: "5-7 yrs",
    salary_label: "$48k–$60k",
    remote: false,
  },
  {
    id: "sample-2",
    job_id: "sample-2",
    title: "Backend Engineer",
    company: "OrbitStack",
    location: "Remote",
    score: 77,
    skill_score: 79,
    role_score: 76,
    location_score: 90,
    experience_score: 70,
    matched_skills: ["Node.js", "PostgreSQL", "Docker", "Kubernetes"],
    missing_skills: ["AWS"],
    created_at: new Date().toISOString(),
    experience_label: "4-6 yrs",
    salary_label: "$55k–$70k",
    remote: true,
  },
  {
    id: "sample-3",
    job_id: "sample-3",
    title: "Data Analyst",
    company: "Insightly",
    location: "Remote",
    score: 64,
    skill_score: 62,
    role_score: 60,
    location_score: 90,
    experience_score: 55,
    matched_skills: ["SQL", "PostgreSQL", "Python"],
    missing_skills: ["Tableau", "Airflow"],
    created_at: new Date().toISOString(),
    experience_label: "2-4 yrs",
    salary_label: "$35k–$45k",
    remote: true,
  },
  {
    id: "sample-4",
    job_id: "sample-4",
    title: "ML Engineer",
    company: "Cortex Labs",
    location: "Dhaka, BD",
    score: 71,
    skill_score: 69,
    role_score: 74,
    location_score: 65,
    experience_score: 70,
    matched_skills: ["Python", "TensorFlow", "Docker"],
    missing_skills: ["Kubernetes", "ML Ops"],
    created_at: new Date().toISOString(),
    experience_label: "3-5 yrs",
    salary_label: "$65k–$80k",
    remote: false,
  },
  {
    id: "sample-5",
    job_id: "sample-5",
    title: "Product Designer",
    company: "Forma Studio",
    location: "Remote",
    score: 55,
    skill_score: 52,
    role_score: 58,
    location_score: 88,
    experience_score: 55,
    matched_skills: ["Figma", "User Research"],
    missing_skills: ["Design Systems", "Prototyping"],
    created_at: new Date().toISOString(),
    experience_label: "3-5 yrs",
    salary_label: "$45k–$60k",
    remote: true,
  },
];

const ringDashArray = 175; // circumference for radius 28
const ringOffset = (score: number) => ((100 - score) / 100) * ringDashArray;

const scoreTone = (score: number) => {
  if (score >= 75) return palette.green;
  if (score >= 50) return palette.amber;
  return palette.red;
};

export function JobMatchesDisplay({ refreshTrigger = 0, onError }: JobMatchesDisplayProps) {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [matches, setMatches] = useState<MatchedJob[]>(sampleMatches);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [updatedAt, setUpdatedAt] = useState("cached · 5 matches");
  const [toasts, setToasts] = useState<{ id: string; message: string; tone: "info" | "success" }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const normalized = (items: MatchedJob[]) =>
  items.map((m) => {
    const jobId = m.job_id ?? m.id ?? crypto.randomUUID();
    const matched_skills = Array.isArray(m.matched_skills) ? m.matched_skills : [];
    const missing_skills = Array.isArray(m.missing_skills) ? m.missing_skills : [];
    const skillRatio =
      matched_skills.length + missing_skills.length > 0
        ? (matched_skills.length / (matched_skills.length + missing_skills.length)) * 100
        : undefined;

    const score = Number.isFinite(m.score) ? m.score : 60;
    const skill_score = Number.isFinite(m.skill_score) ? m.skill_score : skillRatio ?? score;
    const role_score = Number.isFinite(m.role_score) ? m.role_score : score;
    const location_score = Number.isFinite(m.location_score) ? m.location_score : score;
    const experience_score = Number.isFinite(m.experience_score) ? m.experience_score : score;

    const title = m.title || (m as any).job_title || (m as any).role_title || "Untitled role";
    const company = m.company || (m as any).company_name || (m as any).employer || "Unknown";
    const location = m.location || (m as any).job_location || "—";
    const salary_label = m.salary_label || (m as any).salary || "—";
    const experience_label = m.experience_label || (m as any).experience || "—";
    const remote = m.remote ?? location.toLowerCase().includes("remote");

    return {
      ...m,
      id: m.id ?? jobId,
      job_id: jobId,
      score,
      skill_score: Math.round(skill_score),
      role_score: Math.round(role_score),
      location_score: Math.round(location_score),
      experience_score: Math.round(experience_score),
      matched_skills,
      missing_skills,
      location,
      title,
      company,
      experience_label,
      salary_label,
      remote,
    };
  });

  async function loadMatches() {
    if (!supabase) {
      setError(t("profileSupabaseMissing"));
      setMatches(sampleMatches);
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
        setMatches(sampleMatches);
        return;
      }

      setMatches(normalized(data.matches || sampleMatches));
      setUpdatedAt(`cached · ${(data.matches || sampleMatches).length} matches`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
      setMatches(sampleMatches);
    } finally {
      setLoading(false);
    }
  }

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
        setComputing(false);
        return;
      }

      const newMatches = normalized(data.matches || sampleMatches);
      setMatches(newMatches);
      setUpdatedAt(`just now · ${newMatches.length} matches found`);
      pushToast(`Matches refreshed — ${newMatches.length} jobs found ✓`, "info");
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
    if (onError) onError(error);
  }, [error, onError]);

  const pushToast = (message: string, tone: "info" | "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  };

  const normalizeUrl = (url: string) => {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const openApplyLink = (job: MatchedJob) => {
    const link = job.source_url || job.apply_url || job.url;
    if (!link) {
      pushToast("No apply link provided for this job", "info");
      return;
    }
    window.open(normalizeUrl(link), "_blank", "noopener,noreferrer");
  };

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        pushToast("Removed from saved", "info");
      } else {
        next.add(id);
        pushToast("Job saved", "success");
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    return matches.filter((job) => {
      const q = search.toLowerCase();
      const text = `${job.title ?? ""} ${job.company ?? ""} ${(job.matched_skills || []).join(" ")} ${(job.missing_skills || []).join(" ")} ${job.source_url ?? ""}`.toLowerCase();
      const passSearch = q ? text.includes(q) : true;
      const passScore =
        scoreFilter === "all" ? true : scoreFilter === "strong" ? job.score >= 70 : job.score >= 50;
      const passLocation =
        locationFilter === "all" ? true : locationFilter === "remote" ? job.remote : !job.remote;
      return passSearch && passScore && passLocation;
    });
  }, [matches, search, scoreFilter, locationFilter]);

  const savedJobs = useMemo(() => matches.filter((m) => saved.has(m.job_id)), [matches, saved]);

  const renderScoreStrip = (job: MatchedJob) => (
    <div className="grid grid-cols-2 divide-x divide-y divide-[#30363d] border-t border-b border-[#30363d] sm:grid-cols-4 sm:divide-y-0">
      {[
        { label: "Skills", value: Math.round(job.skill_score), color: scoreTone(job.score) },
        { label: "Role", value: Math.round(job.role_score), color: "#9ba6b5" },
        { label: "Location", value: Math.round(job.location_score), color: "#9ba6b5" },
        { label: "Experience", value: Math.round(job.experience_score), color: "#9ba6b5" },
      ].map((item) => (
        <div key={item.label} className="space-y-1 p-2.5 text-center sm:p-3">
          <div className="text-lg font-semibold" style={{ color: item.color }}>
            {item.value}%
          </div>
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-[#1f2730]">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.value}%`, background: item.color, transition: "width 0.5s ease" }}
            />
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#9ba6b5]">{item.label}</div>
        </div>
      ))}
    </div>
  );

  const renderSkillsRow = (job: MatchedJob) => (
    <div className="flex flex-wrap items-center gap-2 px-3 py-3 text-xs sm:px-4 sm:text-sm">
      {job.matched_skills.map((skill) => (
        <span key={`${job.job_id}-${skill}`} className="rounded-full border border-[#3fb950] px-2.5 py-1 text-[#3fb950] sm:px-3">
          ✓ {skill}
        </span>
      ))}
      {job.missing_skills.length > 0 && <span className="text-[#9ba6b5]">•</span>}
      {job.missing_skills.length ? (
        job.missing_skills.map((skill) => (
          <span key={`${job.job_id}-${skill}`} className="rounded-full border border-[#f85149] px-2.5 py-1 text-[#f85149] sm:px-3">
            ⓘ {skill}
          </span>
        ))
      ) : (
        <span className="text-[#3fb950]">✓ Perfect skill match!</span>
      )}
    </div>
  );

  return (
    <div className="min-h-full space-y-5 md:space-y-6">
      {/* Header */}
        <div className="relative overflow-hidden flex flex-col gap-3 rounded-3xl border border-[#2e3948] bg-[linear-gradient(135deg,#161b22,#101726)] p-4 shadow-[0_16px_44px_rgba(2,8,20,0.35)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(88,166,255,0.16),transparent_42%)]" />
          <div className="space-y-1">
            <div className="relative text-xl font-bold sm:text-2xl" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
              ⚡ Smart Matches
            </div>
            <div className="relative text-sm text-[#9ba6b5]">Personalized roles curated for you.</div>
          <div className="relative text-xs uppercase tracking-[0.16em] text-[#6e7681]">Last updated: {updatedAt}</div>
          </div>
          <button
            onClick={computeMatches}
            disabled={computing}
            className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#58a6ff] px-4 py-2.5 text-sm font-semibold text-[#0b1020] transition hover:translate-y-[-1px] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#2d3d55] sm:w-auto"
            style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}
          >
            ↻ {computing ? "Finding..." : "Find Matches"}
          </button>
        </div>

      {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#2e3948] bg-[#121926] p-3.5 sm:p-4 lg:flex-row lg:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Filter by title, company, skill..."
            className="w-full rounded-full border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-white outline-none transition focus:border-[#58a6ff]"
          />
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className="w-full rounded-full border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none transition focus:border-[#58a6ff] sm:w-auto"
          >
            <option value="all">All Scores</option>
            <option value="strong">70%+ Strong</option>
            <option value="good">50%+ Good</option>
          </select>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "remote", label: "Remote" },
              { key: "local", label: "Local" },
            ].map((opt) => {
              const active = locationFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setLocationFilter(opt.key as LocationFilter)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    active
                      ? "border-[#58a6ff] bg-[#58a6ff] text-[#0b1020]"
                      : "border-[#30363d] bg-[#0d1117] text-white hover:border-[#58a6ff]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

      {/* Saved jobs */}
      <AnimatePresence>
        {savedJobs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-3 rounded-2xl border border-[#2e3948] bg-[#121926] p-3.5 sm:p-4"
          >
            <div className="text-sm font-semibold" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
              ★ Saved Jobs
            </div>
            <div className="divide-y divide-[#30363d]">
              {savedJobs.map((job) => (
                <div key={job.job_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="space-y-1">
                    <div className="font-semibold" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                      {job.title}
                    </div>
                    <div className="text-[#9ba6b5]">{job.company}</div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: scoreTone(job.score) }}>
                    {Math.round(job.score)}%
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2e3948] bg-[#121926] p-7 text-center sm:p-10">
          <div className="text-3xl">⚡</div>
          <div className="text-lg font-semibold" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
            No matches yet
          </div>
          <p className="max-w-md text-sm text-[#9ba6b5]">Run Smart Matches or adjust filters to see curated roles tailored to you.</p>
          <button
            onClick={computeMatches}
            className="rounded-lg bg-[#58a6ff] px-4 py-2 text-sm font-semibold text-[#0b1020] transition hover:translate-y-[-1px]"
            style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}
          >
            + Find Matches
          </button>
        </div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading || computing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#2e3948] bg-[#121926] p-7 text-center text-sm text-[#9ba6b5] sm:p-10"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#58a6ff] border-t-transparent" />
            <div className="text-white">Computing your top matches...</div>
            <div className="text-xs text-[#9ba6b5]">Personalizing roles, skills, and seniority fit.</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Match cards */}
      {!loading && !computing && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((job) => {
            const companyName = job.company ?? "Unknown";
            const initials = (job.company || job.title || "??").slice(0, 2).toUpperCase();
            const ringColor = scoreTone(job.score);
            const isSaved = saved.has(job.job_id);
            return (
              <motion.article
                key={job.job_id}
                whileHover={{ y: -1 }}
                className={`overflow-hidden rounded-2xl border bg-[#161d2a] transition ${isSaved ? "border-l-4 border-l-[#58a6ff]" : ""}`}
                style={{ borderColor: palette.border }}
              >
                <div className="flex flex-col gap-3 p-3.5 sm:p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold"
                      style={{ background: ringColor, color: "#0b1020" }}
                    >
                      {initials}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold sm:text-[15px]" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                        {job.title}
                      </div>
                      <div className="text-xs text-[#9ba6b5] sm:text-sm">{companyName}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-white">
                        <span className="rounded-full border border-[#30363d] bg-[#1c2128] px-2 py-1">📍 {job.location ?? "—"}</span>
                        <span className="rounded-full border border-[#30363d] bg-[#1c2128] px-2 py-1">📈 {job.experience_label ?? "—"}</span>
                        <span className="rounded-full border border-[#30363d] bg-[#1c2128] px-2 py-1">💰 {job.salary_label ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="relative h-14 w-14">
                      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                        <circle cx="28" cy="28" r="28" fill="none" stroke="#1f2730" strokeWidth="6" />
                        <circle
                          cx="28"
                          cy="28"
                          r="28"
                          fill="none"
                          stroke={ringColor}
                          strokeWidth="6"
                          strokeDasharray={ringDashArray}
                          strokeDashoffset={ringOffset(job.score)}
                          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-bold" style={{ color: ringColor }}>
                          {Math.round(job.score)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#9ba6b5]">fit</div>
                      </div>
                    </div>
                  </div>
                </div>

                {renderScoreStrip(job)}
                {renderSkillsRow(job)}

                  <div className="flex flex-col gap-3 border-t border-[#30363d] bg-[#1a2332] p-3.5 sm:p-4 md:flex-row">
                    <button
                      className="flex-[2] rounded-lg bg-[#58a6ff] px-4 py-2 text-sm font-semibold text-[#0b1020]"
                      onClick={() => openApplyLink(job)}
                    >
                      Apply Now ↗
                    </button>
                    <button
                      onClick={() => toggleSave(job.job_id)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        isSaved
                          ? "border-[#58a6ff] text-[#58a6ff] bg-[#0d1117]"
                          : "border-[#30363d] text-white bg-[#161b22] hover:border-[#58a6ff]"
                      }`}
                    >
                      {isSaved ? "★ Saved" : "☆ Save Job"}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

      {/* Footer stats */}
      {!loading && !computing && filtered.length > 0 && (
        <div className="rounded-xl border border-[#2e3948] bg-[#121926] p-4 text-center text-sm text-[#9ba6b5]">
          Showing {filtered.length} matches · {updatedAt}
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 flex flex-col gap-2 sm:left-auto sm:right-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto w-[calc(100vw-2rem)] rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 text-sm text-white sm:w-72 ${
                toast.tone === "success" ? "border-l-4 border-l-[#3fb950]" : "border-l-4 border-l-[#58a6ff]"
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
