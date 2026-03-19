import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { DocumentMeta, Education, Experience, Profile, Project, Skill } from "@/types/profile";

export interface PublicPortfolio {
  profile: Profile;
  educations: Education[];
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  documents: DocumentMeta[];
}

export async function getPublicPortfolioByUsername(username: string): Promise<PublicPortfolio | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const normalized = username.trim().toLowerCase();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", normalized)
    .eq("is_public", true)
    .maybeSingle();

  if (!profileData) return null;

  const [educations, skills, projects, experiences, documents] = await Promise.all([
    supabase.from("educations").select("*").eq("user_id", profileData.id).order("created_at", { ascending: false }),
    supabase.from("skills").select("*").eq("user_id", profileData.id).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("user_id", profileData.id).order("created_at", { ascending: false }),
    supabase.from("experiences").select("*").eq("user_id", profileData.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", profileData.id).order("uploaded_at", { ascending: false }),
  ]);

  return {
    profile: profileData as Profile,
    educations: (educations.data ?? []) as Education[],
    skills: (skills.data ?? []) as Skill[],
    projects: (projects.data ?? []) as Project[],
    experiences: (experiences.data ?? []) as Experience[],
    documents: (documents.data ?? []) as DocumentMeta[],
  };
}
