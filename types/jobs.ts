export type JobPostStatus = "pending" | "approved" | "rejected";
export type JobApplicationStatus = "applied" | "screening" | "interview" | "offer" | "rejected" | "hired";

export type JobStatus = "pending" | "approved" | "rejected";
export type MvpJobApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  required_skills: string[];
  experience_min: number | null;
  experience_max: number | null;
  source: string | null;
  source_url: string | null;
  status: JobStatus;
  created_by: string | null;
  created_at: string;
}

export interface JobPost {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  apply_url: string | null;
  status: JobPostStatus;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  job_post_id: string | null;
  role_title: string;
  company: string;
  status: JobApplicationStatus;
  applied_at: string | null;
  follow_up_date: string | null;
  notes: string | null;
  ai_followup_draft: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  job_id: string;
  skill_score: number;
  role_score: number;
  location_score: number;
  experience_score: number;
  total_score: number;
  matched_skills: string[];
  missing_skills: string[];
  computed_at: string;
  created_at: string;
}

export interface JobMatchResult extends JobMatch {
  // Extended fields for display
  job?: Job;
  score_percent?: number;
}
