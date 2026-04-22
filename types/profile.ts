export type UUID = string;

export interface Profile {
  id: UUID;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  target_role: string | null;
  preferred_location: string | null;
  years_experience: number | null;
  theme: string | null;
  is_public: boolean;
}

export interface Education {
  id: UUID;
  user_id: UUID;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
  description: string | null;
}

export interface Skill {
  id: UUID;
  user_id: UUID;
  name: string;
  level: string | null;
}

export interface Project {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  url: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Experience {
  id: UUID;
  user_id: UUID;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export interface DocumentMeta {
  id: UUID;
  user_id: UUID;
  name: string;
  url: string;
  type: string | null;
}

export interface ProfileBundle {
  profile: Profile | null;
  educations: Education[];
  skills: Skill[];
  projects: Project[];
  experiences: Experience[];
  documents: DocumentMeta[];
}
