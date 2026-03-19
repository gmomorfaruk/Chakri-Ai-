/**
 * POST /api/jobs/match
 * 
 * Computes job matches for the current user
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { computeJobMatch, scoreToPercentage } from "@/lib/jobMatchingEngine";
import {
  getUserProfileForMatching,
  getApprovedJobs,
  deleteJobMatches,
  upsertJobMatch,
  getUserJobMatches,
} from "@/lib/jobsService";
import { Job } from "@/types/jobs";

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

    // Step 3: Fetch all approved jobs
    const { data: jobs, error: jobsError } = await getApprovedJobs(supabase);
    if (jobsError || !jobs) {
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    if (jobs.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Step 4: Clear old matches and compute new ones
    const { error: deleteError } = await deleteJobMatches(supabase, userId);
    if (deleteError) {
      console.error("deleteJobMatches error:", deleteError);
    }

    const matchResults = [];

    // Step 5: Run matching algorithm for each job and store results
    for (const job of jobs) {
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

      // Only store matches above 0 (no relevance threshold needed)
      const { error: insertError } = await upsertJobMatch(supabase, userId, job.id, {
        skill_score: matchScore.skill_score,
        role_score: matchScore.role_score,
        location_score: matchScore.location_score,
        experience_score: matchScore.experience_score,
        total_score: matchScore.total_score,
        matched_skills: matchScore.matched_skills,
        missing_skills: matchScore.missing_skills,
      });

      if (!insertError) {
        matchResults.push({
          job_id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          score: scoreToPercentage(matchScore.total_score),
          skill_score: scoreToPercentage(matchScore.skill_score),
          role_score: scoreToPercentage(matchScore.role_score),
          location_score: scoreToPercentage(matchScore.location_score),
          experience_score: scoreToPercentage(matchScore.experience_score),
          matched_skills: matchScore.matched_skills,
          missing_skills: matchScore.missing_skills,
        });
      } else {
        console.error("upsertJobMatch error:", insertError);
      }
    }

    // Step 6: Sort by score and return top 10
    matchResults.sort((a, b) => b.score - a.score);
    const topMatches = matchResults.slice(0, 10);

    return NextResponse.json({
      success: true,
      message: `Computed ${matchResults.length} matches, showing top ${topMatches.length}`,
      total_matches: matchResults.length,
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

    // Fetch existing matches
    const { data: matches, error: matchesError } = await getUserJobMatches(supabase, userId, limit);
    if (matchesError) {
      console.error("getUserJobMatches error:", matchesError);
      return NextResponse.json({ error: matchesError.message || "Failed to fetch matches" }, { status: 500 });
    }

    // Format response
    const formattedMatches = (matches ?? []).map((match: any) => ({
      id: match.id,
      job_id: match.job_id,
      score: scoreToPercentage(match.total_score),
      skill_score: scoreToPercentage(match.skill_score),
      role_score: scoreToPercentage(match.role_score),
      location_score: scoreToPercentage(match.location_score),
      experience_score: scoreToPercentage(match.experience_score),
      matched_skills: match.matched_skills,
      missing_skills: match.missing_skills,
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

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      total: formattedMatches.length,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
