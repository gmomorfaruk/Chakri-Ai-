import { SupabaseClient } from "@supabase/supabase-js";
import { Job, JobApplication, JobApplicationStatus, JobPost } from "@/types/jobs";

export async function getCurrentUserProfileRole(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? "user";
}

export async function createJobPost(
  supabase: SupabaseClient,
  payload: Pick<JobPost, "user_id" | "title" | "company" | "location" | "description" | "apply_url">
) {
  return supabase.from("job_posts").insert(payload).select("*").single();
}

// Step 3 MVP jobs-table APIs
export async function createJob(
  supabase: SupabaseClient,
  payload: Pick<Job, "title" | "company" | "location" | "description" | "required_skills" | "experience_min" | "experience_max" | "source" | "source_url" | "created_by"> & {
    status?: "pending" | "approved" | "rejected";
  }
) {
  return supabase
    .from("jobs")
    .insert({ ...payload, status: payload.status ?? "pending" })
    .select("*")
    .single();
}

export async function getMyJobs(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("jobs")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .returns<Job[]>();
}

export async function getApprovedJobs(supabase: SupabaseClient) {
  return supabase
    .from("jobs")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .returns<Job[]>();
}

export async function getPendingJobsForAdmin(supabase: SupabaseClient) {
  return supabase
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<Job[]>();
}

export async function moderateJob(
  supabase: SupabaseClient,
  jobId: string,
  status: "approved" | "rejected"
) {
  return supabase.from("jobs").update({ status }).eq("id", jobId).select("*").single();
}

export async function getMyJobPosts(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("job_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<JobPost[]>();
}

export async function getApprovedJobPosts(supabase: SupabaseClient) {
  return supabase
    .from("job_posts")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .returns<JobPost[]>();
}

export async function getPendingJobPostsForAdmin(supabase: SupabaseClient) {
  return supabase
    .from("job_posts")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<JobPost[]>();
}

export async function moderateJobPost(
  supabase: SupabaseClient,
  jobPostId: string,
  status: "approved" | "rejected",
  moderationNote?: string
) {
  return supabase
    .from("job_posts")
    .update({ status, moderation_note: moderationNote ?? null, updated_at: new Date().toISOString() })
    .eq("id", jobPostId)
    .select("*")
    .single();
}

export async function createJobApplication(
  supabase: SupabaseClient,
  payload: Pick<JobApplication, "user_id" | "job_post_id" | "role_title" | "company" | "status" | "applied_at" | "follow_up_date" | "notes" | "ai_followup_draft">
) {
  return supabase.from("job_applications").insert(payload).select("*").single();
}

export async function getMyJobApplications(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<JobApplication[]>();
}

export async function updateJobApplicationStatus(
  supabase: SupabaseClient,
  id: string,
  status: JobApplicationStatus
) {
  return supabase
    .from("job_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
}

export async function updateJobApplicationFollowUpDraft(
  supabase: SupabaseClient,
  id: string,
  ai_followup_draft: string
) {
  return supabase
    .from("job_applications")
    .update({ ai_followup_draft, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
}

export async function deleteJobApplication(supabase: SupabaseClient, id: string) {
  return supabase.from("job_applications").delete().eq("id", id);
}

export function generateFollowUpDraft(roleTitle: string, company: string) {
  return `Subject: Follow-up on ${roleTitle} application\n\nHello ${company} hiring team,\n\nI hope you are well. I wanted to follow up regarding my application for the ${roleTitle} role. I remain very interested and would appreciate any update on the hiring process.\n\nThank you for your time and consideration.\n\nBest regards,`;
}

// ============================================
// JOB MATCHING FUNCTIONS
// ============================================

export async function getUserProfileForMatching(supabase: SupabaseClient, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, target_role, preferred_location, years_experience")
    .eq("id", userId)
    .maybeSingle();

  // Fallback for schema versions where matching columns are not on profiles.
  if (profileError) {
    const { data: baseProfile, error: baseProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (baseProfileError || !baseProfile) {
      return null;
    }

    let fallbackTargetRole: string | null = null;

    // Optional enrichment: infer target role from latest roadmap if available.
    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("target_role")
      .eq("user_id", userId)
      .not("target_role", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    fallbackTargetRole = roadmap?.target_role ?? null;

    const { data: skillsRows } = await supabase
      .from("skills")
      .select("name")
      .eq("user_id", userId);

    const skills = (skillsRows ?? []).map((s) => s.name).filter(Boolean);

    return {
      id: baseProfile.id,
      target_role: fallbackTargetRole,
      preferred_location: null,
      years_experience: null,
      skills,
    };
  }

  const { data: skillsRows } = await supabase
    .from("skills")
    .select("name")
    .eq("user_id", userId);

  const skills = (skillsRows ?? []).map((s) => s.name).filter(Boolean);

  return profile
    ? {
        ...profile,
        skills,
      }
    : null;
}

export async function getUserJobMatches(supabase: SupabaseClient, userId: string, limit = 10) {
  const richQuery = await supabase
    .from("job_matches")
    .select(
      `
      id,
      job_id,
      skill_score,
      role_score,
      location_score,
      experience_score,
      total_score,
      matched_skills,
      missing_skills,
      created_at,
      jobs!job_id (id, title, company, location, description, required_skills, experience_min, experience_max)
    `
    )
    .eq("user_id", userId)
    .order("total_score", { ascending: false })
    .limit(limit);

  if (!richQuery.error) {
    return richQuery;
  }

  // Fallback for schema variants without matched_skills/missing_skills/computed_at columns.
  const basicQuery = await supabase
    .from("job_matches")
    .select(
      `
      id,
      job_id,
      skill_score,
      role_score,
      location_score,
      experience_score,
      total_score,
      created_at
    `
    )
    .eq("user_id", userId)
    .order("total_score", { ascending: false })
    .limit(limit);

  if (basicQuery.error) {
    return basicQuery;
  }

  const basicRows = (basicQuery.data ?? []) as Array<{
    id: string;
    job_id: string;
    skill_score: number;
    role_score: number;
    location_score: number;
    experience_score: number;
    total_score: number;
    created_at: string;
  }>;

  const jobIds = Array.from(new Set(basicRows.map((row) => row.job_id).filter(Boolean)));

  let jobsById = new Map<string, {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string;
    required_skills: string[];
    experience_min: number | null;
    experience_max: number | null;
  }>();

  if (jobIds.length > 0) {
    const { data: jobsRows } = await supabase
      .from("jobs")
      .select("id, title, company, location, description, required_skills, experience_min, experience_max")
      .in("id", jobIds);

    jobsById = new Map((jobsRows ?? []).map((job) => [job.id, job]));
  }

  const mergedRows = basicRows.map((row) => ({
    ...row,
    matched_skills: [] as string[],
    missing_skills: [] as string[],
    jobs: jobsById.get(row.job_id) ?? null,
  }));

  return { data: mergedRows, error: null };
}

export async function upsertJobMatch(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  matchData: {
    skill_score: number;
    role_score: number;
    location_score: number;
    experience_score: number;
    total_score: number;
    matched_skills: string[];
    missing_skills: string[];
  }
) {
  const richUpsert = await supabase
    .from("job_matches")
    .upsert(
      {
        user_id: userId,
        job_id: jobId,
        ...matchData,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,job_id" }
    )
    .select("*")
    .single();

  if (!richUpsert.error) {
    return richUpsert;
  }

  // Fallback for schema versions without matched_skills/missing_skills/computed_at.
  return supabase
    .from("job_matches")
    .upsert(
      {
        user_id: userId,
        job_id: jobId,
        skill_score: matchData.skill_score,
        role_score: matchData.role_score,
        location_score: matchData.location_score,
        experience_score: matchData.experience_score,
        total_score: matchData.total_score,
      },
      { onConflict: "user_id,job_id" }
    )
    .select("*")
    .single();
}

export async function deleteJobMatches(supabase: SupabaseClient, userId: string) {
  return supabase.from("job_matches").delete().eq("user_id", userId);
}
