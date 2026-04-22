import { SupabaseClient } from "@supabase/supabase-js";
import {
  DocumentMeta,
  Education,
  Experience,
  Profile,
  ProfileBundle,
  Project,
  Skill,
} from "@/types/profile";

type ProfileUpdate = Pick<
  Profile,
  "username" | "full_name" | "bio" | "avatar_url" | "target_role" | "preferred_location" | "years_experience" | "theme" | "is_public"
>;
type ProfileBootstrap = Partial<ProfileUpdate>;
type InsertEducation = Omit<Education, "id">;
type InsertSkill = Omit<Skill, "id">;
type InsertProject = Omit<Project, "id">;
type InsertExperience = Omit<Experience, "id">;
type InsertDocument = Omit<DocumentMeta, "id">;

export async function getCurrentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function fetchProfileBundle(supabase: SupabaseClient, userId: string): Promise<ProfileBundle> {
  const [profileRes, educationRes, skillRes, projectRes, experienceRes, documentRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("educations").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("skills").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", userId).order("uploaded_at", { ascending: false }),
  ]);

  return {
    profile: profileRes.data as Profile | null,
    educations: (educationRes.data ?? []) as Education[],
    skills: (skillRes.data ?? []) as Skill[],
    projects: (projectRes.data ?? []) as Project[],
    experiences: (experienceRes.data ?? []) as Experience[],
    documents: (documentRes.data ?? []) as DocumentMeta[],
  };
}

export async function upsertProfile(supabase: SupabaseClient, userId: string, payload: ProfileUpdate) {
  const primaryResult = await supabase.from("profiles").upsert({ id: userId, ...payload }).select("*").single();

  if (!primaryResult.error) {
    return primaryResult;
  }

  const missingMatchingColumn =
    primaryResult.error.code === "42703" ||
    /target_role|preferred_location|years_experience/i.test(primaryResult.error.message);

  if (!missingMatchingColumn) {
    return primaryResult;
  }

  const legacyPayload = {
    username: payload.username,
    full_name: payload.full_name,
    bio: payload.bio,
    avatar_url: payload.avatar_url,
    theme: payload.theme,
    is_public: payload.is_public,
  };

  return supabase.from("profiles").upsert({ id: userId, ...legacyPayload }).select("*").single();
}

export async function ensureProfileExists(supabase: SupabaseClient, userId: string, payload: ProfileBootstrap = {}) {
  const existingRes = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (existingRes.error) {
    return { data: null, error: existingRes.error };
  }

  if (existingRes.data) {
    return { data: existingRes.data, error: null };
  }

  const insertRes = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: payload.username ?? null,
      full_name: payload.full_name ?? null,
      bio: payload.bio ?? null,
      avatar_url: payload.avatar_url ?? null,
      theme: payload.theme ?? "default",
      is_public: payload.is_public ?? false,
    })
    .select("*")
    .single();

  // Handle race condition or username uniqueness conflicts.
  if (insertRes.error?.code === "23505") {
    const existingByIdRes = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (existingByIdRes.error) {
      return { data: null, error: existingByIdRes.error };
    }

    if (existingByIdRes.data) {
      return { data: existingByIdRes.data, error: null };
    }

    return supabase
      .from("profiles")
      .insert({
        id: userId,
        username: null,
        full_name: payload.full_name ?? null,
        bio: payload.bio ?? null,
        avatar_url: payload.avatar_url ?? null,
        theme: payload.theme ?? "default",
        is_public: payload.is_public ?? false,
      })
      .select("*")
      .single();
  }

  return insertRes;
}

export async function createEducation(supabase: SupabaseClient, payload: InsertEducation) {
  return supabase.from("educations").insert(payload).select("*").single();
}

export async function updateEducation(supabase: SupabaseClient, id: string, payload: Partial<InsertEducation>) {
  return supabase.from("educations").update(payload).eq("id", id).select("*").single();
}

export async function deleteEducation(supabase: SupabaseClient, id: string) {
  return supabase.from("educations").delete().eq("id", id);
}

export async function createSkill(supabase: SupabaseClient, payload: InsertSkill) {
  return supabase.from("skills").insert(payload).select("*").single();
}

export async function updateSkill(supabase: SupabaseClient, id: string, payload: Partial<InsertSkill>) {
  return supabase.from("skills").update(payload).eq("id", id).select("*").single();
}

export async function deleteSkill(supabase: SupabaseClient, id: string) {
  return supabase.from("skills").delete().eq("id", id);
}

export async function createProject(supabase: SupabaseClient, payload: InsertProject) {
  return supabase.from("projects").insert(payload).select("*").single();
}

export async function updateProject(supabase: SupabaseClient, id: string, payload: Partial<InsertProject>) {
  return supabase.from("projects").update(payload).eq("id", id).select("*").single();
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  return supabase.from("projects").delete().eq("id", id);
}

export async function createExperience(supabase: SupabaseClient, payload: InsertExperience) {
  return supabase.from("experiences").insert(payload).select("*").single();
}

export async function updateExperience(supabase: SupabaseClient, id: string, payload: Partial<InsertExperience>) {
  return supabase.from("experiences").update(payload).eq("id", id).select("*").single();
}

export async function deleteExperience(supabase: SupabaseClient, id: string) {
  return supabase.from("experiences").delete().eq("id", id);
}

export async function createDocument(supabase: SupabaseClient, payload: InsertDocument) {
  return supabase.from("documents").insert(payload).select("*").single();
}

export async function updateDocument(supabase: SupabaseClient, id: string, payload: Partial<InsertDocument>) {
  return supabase.from("documents").update(payload).eq("id", id).select("*").single();
}

export async function deleteDocument(supabase: SupabaseClient, id: string) {
  return supabase.from("documents").delete().eq("id", id);
}

export function getProfileCompletion(bundle: ProfileBundle): number {
  const checks = [
    Boolean(bundle.profile?.full_name?.trim()),
    Boolean(bundle.profile?.bio?.trim()),
    bundle.educations.length > 0,
    bundle.skills.length >= 3,
    bundle.projects.length > 0,
    bundle.experiences.length > 0,
    bundle.documents.length > 0,
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
