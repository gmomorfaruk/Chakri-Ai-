export type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

export type NavItem = { name: string; icon: string; route: string; badge?: number; dot?: boolean; active?: boolean };
export type NavSection = { label: string; items: NavItem[] };

export interface ProfileDraft {
  username: string;
  fullName: string;
  tagline: string;
  location: string;
  portfolioUrl: string;
  roles: string;
  summary: string;
}

export interface LearningWelcomeStateProps {
  topic: LearningTopic;
  onSuggestedQuestion: (question: string) => void;
  /** Use "embedded" when rendering inside another layout (e.g., AI career coach) to avoid nested shells. */
  variant?: "standalone" | "embedded";
}
