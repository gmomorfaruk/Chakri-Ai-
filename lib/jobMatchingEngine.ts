/**
 * Job Matching Algorithm for Chakri AI
 * Computes match scores based on 4 factors:
 * - Skill match (40%)
 * - Role match (20%)
 * - Location match (20%)
 * - Experience match (20%)
 */

import { Job } from "@/types/jobs";

export interface UserProfileForMatching {
  id: string;
  skills: string[];
  target_role?: string | null;
  preferred_location?: string | null;
  years_experience?: number | null;
}

export interface MatchingScore {
  skill_score: number;
  role_score: number;
  location_score: number;
  experience_score: number;
  total_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

const ROLE_ALIAS_GROUPS = [
  ["developer", "engineer", "programmer", "software"],
  ["frontend", "front-end", "ui"],
  ["backend", "back-end", "api", "server"],
  ["fullstack", "full-stack", "full", "stack"],
  ["data", "analyst", "analytics", "bi"],
  ["ml", "machine", "learning", "ai"],
  ["designer", "design", "ux", "uiux", "product"],
  ["manager", "lead", "head", "director"],
];

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  "react.js": "react",
  "reactjs": "react",
  node: "node.js",
  "nodejs": "node.js",
  postgres: "postgresql",
  "postgre sql": "postgresql",
  "nextjs": "next.js",
  "next js": "next.js",
  "tailwindcss": "tailwind",
  "c sharp": "c#",
  "c plus plus": "c++",
};

const LOCATION_STOP_WORDS = new Set(["city", "district", "division", "state", "area", "region"]);
const REMOTE_KEYWORDS = ["remote", "work from home", "wfh", "anywhere", "distributed"];

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,/\-&()]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setB = new Set(b);
  const overlap = unique(a).filter((token) => setB.has(token)).length;
  return overlap / Math.max(unique(a).length, unique(b).length);
}

function normalizeSkillTerm(skill: string): string {
  const normalized = normalize(skill).replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ").trim();
  return SKILL_ALIASES[normalized] ?? normalized;
}

function scoreSkillPair(jobSkill: string, userSkill: string): number {
  const normalizedJob = normalizeSkillTerm(jobSkill);
  const normalizedUser = normalizeSkillTerm(userSkill);

  if (!normalizedJob || !normalizedUser) return 0;
  if (normalizedJob === normalizedUser) return 1;

  if (normalizedJob.includes(normalizedUser) || normalizedUser.includes(normalizedJob)) {
    return 0.75;
  }

  const tokenScore = overlapRatio(tokenize(normalizedJob), tokenize(normalizedUser));
  if (tokenScore > 0) {
    return Math.min(0.85, 0.45 + tokenScore * 0.4);
  }

  return 0;
}

function sharesRoleFamily(userRole: string, jobTitle: string): boolean {
  return ROLE_ALIAS_GROUPS.some((group) => {
    const userHas = group.some((alias) => userRole.includes(alias));
    const jobHas = group.some((alias) => jobTitle.includes(alias));
    return userHas && jobHas;
  });
}

function isRemoteLocation(value: string): boolean {
  const normalizedValue = normalize(value);
  return REMOTE_KEYWORDS.some((keyword) => normalizedValue.includes(keyword));
}

function locationTokens(value: string): string[] {
  return tokenize(value).filter((token) => !LOCATION_STOP_WORDS.has(token));
}

function inferCountryToken(tokens: string[]): string | null {
  if (tokens.length === 0) return null;

  const normalizedTokens = new Set(tokens);
  if (normalizedTokens.has("bangladesh") || normalizedTokens.has("bd")) return "bangladesh";
  if (normalizedTokens.has("india") || normalizedTokens.has("in")) return "india";
  if (normalizedTokens.has("usa") || normalizedTokens.has("us") || normalizedTokens.has("united") || normalizedTokens.has("states")) {
    return "usa";
  }

  return null;
}

/**
 * FACTOR 1: Skill Matching (40%)
 * Compares user skills with job required skills
 */
export function calculateSkillScore(
  userSkills: string[],
  jobRequiredSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  if (!jobRequiredSkills || jobRequiredSkills.length === 0) {
    return { score: 1.0, matched: [], missing: [] };
  }

  const userSkillPool = unique((userSkills ?? []).map((skill) => skill?.trim()).filter(Boolean) as string[]);
  const requiredSkills = unique((jobRequiredSkills ?? []).map((skill) => skill?.trim()).filter(Boolean) as string[]);

  if (requiredSkills.length === 0) {
    return { score: 1.0, matched: [], missing: [] };
  }

  if (userSkillPool.length === 0) {
    return { score: 0, matched: [], missing: requiredSkills };
  }

  const perSkillScores = requiredSkills.map((jobSkill) => {
    const best = userSkillPool.reduce((maxScore, userSkill) => {
      const pairScore = scoreSkillPair(jobSkill, userSkill);
      return Math.max(maxScore, pairScore);
    }, 0);

    return { jobSkill, score: best };
  });

  const matched = perSkillScores.filter((entry) => entry.score >= 0.6).map((entry) => entry.jobSkill);
  const missing = perSkillScores.filter((entry) => entry.score < 0.45).map((entry) => entry.jobSkill);
  const score = perSkillScores.reduce((sum, entry) => sum + entry.score, 0) / perSkillScores.length;

  return {
    score: Math.min(1.0, score),
    matched,
    missing,
  };
}

/**
 * FACTOR 2: Role Matching (20%)
 * Compares user target role with job title
 */
export function calculateRoleScore(userTargetRole: string | null | undefined, jobTitle: string): number {
  if (!userTargetRole || !jobTitle) {
    return 0.5; // Neutral if missing data
  }

  const normalizedUserRole = normalize(userTargetRole);
  const normalizedJobTitle = normalize(jobTitle);

  if (normalizedUserRole === normalizedJobTitle) {
    return 1.0;
  }

  if (normalizedJobTitle.includes(normalizedUserRole) || normalizedUserRole.includes(normalizedJobTitle)) {
    return 0.9;
  }

  const userKeywords = tokenize(normalizedUserRole);
  const jobKeywords = tokenize(normalizedJobTitle);
  const tokenOverlap = overlapRatio(userKeywords, jobKeywords);
  const familyMatch = sharesRoleFamily(normalizedUserRole, normalizedJobTitle);

  if (familyMatch && tokenOverlap > 0) {
    return 0.8;
  }

  if (familyMatch) {
    return 0.7;
  }

  if (tokenOverlap > 0) {
    return Math.min(0.8, 0.4 + tokenOverlap * 0.4);
  }

  return 0.1;
}

/**
 * FACTOR 3: Location Matching (20%)
 * Compares user preferred location with job location
 */
export function calculateLocationScore(userLocation: string | null | undefined, jobLocation: string | null | undefined): number {
  if (!userLocation || !jobLocation) {
    return 0.5; // Neutral if missing data
  }

  const normalizedUserLocation = normalize(userLocation);
  const normalizedJobLocation = normalize(jobLocation);

  const userWantsRemote = isRemoteLocation(normalizedUserLocation);
  const jobIsRemote = isRemoteLocation(normalizedJobLocation);

  if (jobIsRemote) {
    return userWantsRemote ? 1.0 : 0.95;
  }

  if (userWantsRemote && !jobIsRemote) {
    return 0.35;
  }

  if (normalizedUserLocation === normalizedJobLocation) {
    return 1.0;
  }

  if (normalizedJobLocation.includes(normalizedUserLocation) || normalizedUserLocation.includes(normalizedJobLocation)) {
    return 0.85;
  }

  const userTokens = locationTokens(normalizedUserLocation);
  const jobTokens = locationTokens(normalizedJobLocation);
  const tokenOverlap = overlapRatio(userTokens, jobTokens);

  if (tokenOverlap > 0) {
    return Math.min(0.82, 0.45 + tokenOverlap * 0.37);
  }

  const userCountry = inferCountryToken(userTokens);
  const jobCountry = inferCountryToken(jobTokens);
  if (userCountry && jobCountry && userCountry === jobCountry) {
    return 0.55;
  }

  return 0.1;
}

/**
 * FACTOR 4: Experience Matching (20%)
 * Compares user years of experience with job requirements
 */
export function calculateExperienceScore(
  userYearsExperience: number | null | undefined,
  jobExperienceMin: number | null | undefined,
  jobExperienceMax: number | null | undefined
): number {
  if (userYearsExperience === null || userYearsExperience === undefined) {
    return 0.5; // Neutral if missing user data
  }

  // If no job requirements, assume it's fine
  if (!jobExperienceMin && !jobExperienceMax) {
    return 1.0;
  }

  const min = jobExperienceMin ?? 0;
  const max = jobExperienceMax ?? 100;

  // Within range
  if (userYearsExperience >= min && userYearsExperience <= max) {
    return 1.0;
  }

  if (userYearsExperience < min) {
    const gap = min - userYearsExperience;
    if (gap <= 1) return 0.82;
    if (gap <= 2) return 0.65;
    if (gap <= 4) return 0.42;
    return 0.12;
  }

  if (userYearsExperience > max) {
    const gap = userYearsExperience - max;
    if (gap <= 2) return 0.92;
    if (gap <= 5) return 0.78;
    if (gap <= 10) return 0.62;
    return 0.5;
  }

  return 0;
}

/**
 * MAIN MATCHING FUNCTION
 * Computes all 4 factors and returns weighted total score
 */
export function computeJobMatch(userProfile: UserProfileForMatching, job: Job): MatchingScore {
  // Calculate individual scores
  const skillResult = calculateSkillScore(userProfile.skills || [], job.required_skills || []);

  const roleScore = calculateRoleScore(userProfile.target_role, job.title);
  const locationScore = calculateLocationScore(userProfile.preferred_location, job.location);
  const experienceScore = calculateExperienceScore(userProfile.years_experience, job.experience_min, job.experience_max);

  // Calculate weighted total score
  const totalScore = skillResult.score * 0.4 + roleScore * 0.2 + locationScore * 0.2 + experienceScore * 0.2;

  return {
    skill_score: skillResult.score,
    role_score: roleScore,
    location_score: locationScore,
    experience_score: experienceScore,
    total_score: Math.min(1.0, Math.max(0, totalScore)),
    matched_skills: skillResult.matched,
    missing_skills: skillResult.missing,
  };
}

/**
 * Convert score (0-1) to percentage (0-100)
 */
export function scoreToPercentage(score: number): number {
  return Math.round(score * 100);
}
