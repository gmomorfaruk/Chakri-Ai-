/**
 * POST /api/jobs/match
 * 
 * Computes job matches for the current user
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { computeJobMatch, scoreToPercentage } from "@/lib/jobMatchingEngine";
import { fetchUnifiedJobs, unifiedToMatchableJob } from "@/lib/jobDiscovery";
import {
  getUserProfileForMatching,
  getApprovedJobs,
  deleteJobMatches,
  upsertJobMatch,
  getUserJobMatches,
} from "@/lib/jobsService";

// Helper to verify bearer token and get user
async function getUserFromToken(supabase: any, req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

function isInternalJobId(jobId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
}

function dedupeMatchRows<T extends { title?: string | null; company?: string | null; source_url?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();

  for (const row of rows) {
    const key = `${(row.title || "").toLowerCase().trim()}|${(row.company || "").toLowerCase().trim()}|${(row.source_url || "").toLowerCase().trim()}`;
    if (!key.replace(/\|/g, "")) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }

    const existingScore = typeof (existing as any).score === "number" ? (existing as any).score : 0;
    const nextScore = typeof (row as any).score === "number" ? (row as any).score : 0;
    if (nextScore >= existingScore) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    const supabase = await getSupabaseServerClient(token || undefined);
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Get user from token
    let user;
    try {
      user = await getUserFromToken(supabase, req);
    } catch (err) {
      // If token verification fails, try alternative: use cookies + getUser()
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Step 2: Fetch user profile with skills
    const userProfile = await getUserProfileForMatching(supabase, userId);
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Normalize user skills to array
    const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills : [];

    // Step 3: Fetch all approved internal jobs
    const { data: approvedJobs, error: jobsError } = await getApprovedJobs(supabase);
    let jobs = approvedJobs;
    if (jobsError) {
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    // Fallback: if no approved jobs, use all jobs (pending/others) so users can still get scores
    if (!jobs || jobs.length === 0) {
      const { data: fallbackJobs, error: fallbackError } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (fallbackError) {
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
      }
      jobs = fallbackJobs ?? [];
    }

    const externalDiscovery = await fetchUnifiedJobs([], {
      search: userProfile.target_role ?? "",
      includeInternal: false,
      includeExternal: true,
      page: 1,
      limit: 80,
    });

    const externalMatchableJobs = externalDiscovery.jobs.map((item) => unifiedToMatchableJob(item));
    const allJobs = [...jobs, ...externalMatchableJobs];

    if (allJobs.length === 0) {
      return NextResponse.json({ success: true, matches: [], message: "No jobs available for matching yet." });
    }

    // Step 4: Clear old matches and compute new ones
    const { error: deleteError } = await deleteJobMatches(supabase, userId);
    if (deleteError) {
      console.error("deleteJobMatches error:", deleteError);
    }

    const matchResults = [];

    // Step 5: Run matching algorithm for each job and store results
    for (const job of allJobs) {
      const matchScore = computeJobMatch(
        {
          id: userId,
          skills: userSkills,
          target_role: userProfile.target_role,
          preferred_location: userProfile.preferred_location,
          years_experience: userProfile.years_experience,
        },
        job
      );

      // Persist only internal jobs to avoid FK failures for external ids.
      if (isInternalJobId(job.id)) {
        const { error: insertError } = await upsertJobMatch(supabase, userId, job.id, {
          skill_score: matchScore.skill_score,
          role_score: matchScore.role_score,
          location_score: matchScore.location_score,
          experience_score: matchScore.experience_score,
          total_score: matchScore.total_score,
          matched_skills: matchScore.matched_skills,
          missing_skills: matchScore.missing_skills,
        });

        if (insertError) {
          console.error("upsertJobMatch error:", insertError);
        }
      }

      matchResults.push({
        job_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        source_type: isInternalJobId(job.id) ? "internal" : "external_api",
        source_url: job.source_url,
        apply_url: job.source_url,
        description: job.description,
        required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
        score: scoreToPercentage(matchScore.total_score),
        skill_score: scoreToPercentage(matchScore.skill_score),
        role_score: scoreToPercentage(matchScore.role_score),
        location_score: scoreToPercentage(matchScore.location_score),
        experience_score: scoreToPercentage(matchScore.experience_score),
        matched_skills: matchScore.matched_skills,
        missing_skills: matchScore.missing_skills,
      });
    }

    // Step 6: Sort by score and return top 10
    const deduped = dedupeMatchRows(matchResults);
    deduped.sort((a, b) => b.score - a.score);
    const topMatches = deduped.slice(0, 15);

    return NextResponse.json({
      success: true,
      message: `Computed ${deduped.length} matches, showing top ${topMatches.length}`,
      total_matches: deduped.length,
      matches: topMatches,
    });
  } catch (error) {
    console.error("Job matching error:", error);
    return NextResponse.json({ error: "Failed to compute matches" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    const supabase = await getSupabaseServerClient(token || undefined);
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Get user from token
    let user;
    try {
      user = await getUserFromToken(supabase, req);
    } catch (err) {
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Get URL params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "10");

    // Fetch cached internal matches first
    const { data: matches, error: matchesError } = await getUserJobMatches(supabase, userId, limit);
    if (matchesError) {
      console.error("getUserJobMatches error:", matchesError);
      return NextResponse.json({ error: matchesError.message || "Failed to fetch matches" }, { status: 500 });
    }

    // Format response
    const formattedMatches = (matches ?? []).map((match: any) => ({
      id: match.id,
      job_id: match.job_id,
      title: match.jobs?.title ?? null,
      company: match.jobs?.company ?? null,
      location: match.jobs?.location ?? null,
      source: match.jobs?.source ?? "Internal Jobs",
      source_type: "internal",
      source_url: match.jobs?.source_url ?? null,
      apply_url: match.jobs?.source_url ?? null,
      description: match.jobs?.description ?? "",
      required_skills: Array.isArray(match.jobs?.required_skills) ? match.jobs.required_skills : [],
      score: scoreToPercentage(match.total_score),
      skill_score: scoreToPercentage(match.skill_score),
      role_score: scoreToPercentage(match.role_score),
      location_score: scoreToPercentage(match.location_score),
      experience_score: scoreToPercentage(match.experience_score),
      matched_skills: Array.isArray(match.matched_skills) ? match.matched_skills : [],
      missing_skills: Array.isArray(match.missing_skills) ? match.missing_skills : [],
      job: match.jobs
        ? {
            id: match.jobs.id,
            title: match.jobs.title,
            company: match.jobs.company,
            location: match.jobs.location,
            description: match.jobs.description,
            required_skills: match.jobs.required_skills,
          }
        : null,
      created_at: match.created_at,
    }));

    const userProfile = await getUserProfileForMatching(supabase, userId);
    const externalDiscovery = await fetchUnifiedJobs([], {
      search: userProfile?.target_role ?? "",
      includeInternal: false,
      includeExternal: true,
      page: 1,
      limit: Math.max(20, limit * 2),
    });

    const externalRows = (userProfile ? externalDiscovery.jobs : []).map((item) => {
      const matchScore = computeJobMatch(
        {
          id: userId,
          skills: Array.isArray(userProfile?.skills) ? userProfile.skills : [],
          target_role: userProfile?.target_role,
          preferred_location: userProfile?.preferred_location,
          years_experience: userProfile?.years_experience,
        },
        unifiedToMatchableJob(item)
      );

      return {
        id: item.id,
        job_id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        source: item.source,
        source_type: item.source_type,
        source_url: item.source_url,
        apply_url: item.apply_url,
        description: item.full_description,
        required_skills: item.skills,
        score: scoreToPercentage(matchScore.total_score),
        skill_score: scoreToPercentage(matchScore.skill_score),
        role_score: scoreToPercentage(matchScore.role_score),
        location_score: scoreToPercentage(matchScore.location_score),
        experience_score: scoreToPercentage(matchScore.experience_score),
        matched_skills: matchScore.matched_skills,
        missing_skills: matchScore.missing_skills,
        job: null,
        created_at: item.created_at,
      };
    });

    const merged = dedupeMatchRows([...formattedMatches, ...externalRows]).sort((a, b) => b.score - a.score).slice(0, limit);

    return NextResponse.json({
      success: true,
      matches: merged,
      total: merged.length,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
