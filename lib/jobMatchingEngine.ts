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

// Helper: Normalize strings for comparison
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

// Helper: Extract keywords from text (for fallback role matching)
function extractKeywords(text: string): string[] {
  return normalize(text)
    .split(/[\s,/\-&]/)
    .filter((word) => word.length > 2);
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

  const normalizedUserSkills = userSkills.map(normalize).filter(Boolean);
  const normalizedJobSkills = jobRequiredSkills.map(normalize).filter(Boolean);

  // Find matched skills
  const matched = normalizedJobSkills.filter((skill) =>
    normalizedUserSkills.some((userSkill) => userSkill.includes(skill) || skill.includes(userSkill))
  );

  // Find missing skills
  const missing = normalizedJobSkills.filter((skill) => !matched.includes(skill));

  const score = normalizedJobSkills.length > 0 ? matched.length / normalizedJobSkills.length : 1.0;

  return {
    score: Math.min(1.0, score),
    matched: matched.length > 0 ? matched : [],
    missing: missing.length > 0 ? missing : [],
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

  // Exact match or contains
  if (normalizedUserRole === normalizedJobTitle || normalizedJobTitle.includes(normalizedUserRole) || normalizedUserRole.includes(normalizedJobTitle)) {
    return 1.0;
  }

  // Check keyword overlap
  const userKeywords = extractKeywords(normalizedUserRole);
  const jobKeywords = extractKeywords(normalizedJobTitle);

  const overlap = userKeywords.filter((keyword) => jobKeywords.some((jobKeyword) => jobKeyword.includes(keyword) || keyword.includes(jobKeyword)));

  if (overlap.length > 0) {
    return 0.6; // Partial match
  }

  // Check for common role patterns
  const rolePatterns: Record<string, string[]> = {
    developer: ["engineer", "programmer", "developer", "coder"],
    designer: ["ui", "ux", "graphic", "product", "designer"],
    manager: ["lead", "manager", "director", "head"],
    analyst: ["analyst", "data", "business", "product"],
  };

  for (const [pattern, aliases] of Object.entries(rolePatterns)) {
    if (normalizedUserRole.includes(pattern)) {
      const jobMatches = aliases.some((alias) => normalizedJobTitle.includes(alias));
      if (jobMatches) return 0.5;
    }
  }

  return 0; // No relation
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

  // Check for remote
  const remoteKeywords = ["remote", "work from home", "anywhere", "wfh"];
  if (remoteKeywords.some((keyword) => normalizedJobLocation.includes(keyword))) {
    return 1.0; // Remote is always good
  }

  // Same city
  if (normalizedUserLocation === normalizedJobLocation) {
    return 1.0;
  }

  // Extract city/country parts (rough heuristic)
  const userParts = normalizedUserLocation.split(/[,/]/);
  const jobParts = normalizedJobLocation.split(/[,/]/);

  // Same country (last part usually country)
  if (userParts.length > 0 && jobParts.length > 0) {
    const userCountry = userParts[userParts.length - 1].trim();
    const jobCountry = jobParts[jobParts.length - 1].trim();

    if (userCountry === jobCountry) {
      return 0.5; // Same country but different city
    }
  }

  // Partial match (city/region)
  if (userParts[0] && jobParts[0] && userParts[0].trim() === jobParts[0].trim()) {
    return 0.6;
  }

  return 0; // Different locations
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

  // Slightly below (within 1-2 years)
  if (userYearsExperience >= min - 2 && userYearsExperience < min) {
    return 0.5;
  }

  // Above maximum (still somewhat qualified)
  if (userYearsExperience > max) {
    return 0.3; // Over-qualified but still somewhat relevant
  }

  return 0; // Significantly below or no match
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
