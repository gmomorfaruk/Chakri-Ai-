import { LearningTopic, NavSection, ProfileDraft } from "./types";

export const topicMeta: Record<LearningTopic, { title: string; blurb: string }> = {
  general: { title: "Career Guidance", blurb: "Plan your next move, switch domains, or grow faster." },
  it: { title: "IT & Tech", blurb: "Roadmaps, skills, and interview prep for software roles." },
  govt: { title: "Government & BCS", blurb: "BCS strategy, subjects to focus on, and daily routines." },
  bank: { title: "Banking", blurb: "Bank recruitment prep, maths drills, and CV positioning." },
  ngo: { title: "NGO & Development", blurb: "Grant writing, field roles, and impact-focused career paths." },
};

export const topicPrompts: Record<LearningTopic, string[]> = {
  general: [
    "Create a 90-day plan to move from support to product roles",
    "How do I rewrite my CV to highlight transferable skills?",
    "Give me 3 mock interview questions for my next role",
    "What certifications actually help for mid-level roles in BD?",
  ],
  it: [
    "Build me a 6-month roadmap to become a frontend engineer",
    "Mock interview: system design for a news feed (junior level)",
    "What projects strengthen a TypeScript + React portfolio?",
    "How to explain Docker & Kubernetes simply in interviews?",
  ],
  govt: [
    "Outline a 12-week BCS daily study schedule with subjects",
    "Give me 5 recent affairs topics likely to be asked",
    "How should I structure answers for written exams?",
    "BCS viva prep: what etiquette should I follow?",
  ],
  bank: [
    "Create a weekly practice plan for bank recruitment tests",
    "List quantitative aptitude topics I must master first",
    "How to present my finance internship on a banking CV?",
    "Mock interview: why banking after studying engineering?",
  ],
  ngo: [
    "How to transition from private sector to NGO program roles?",
    "Give me a cover letter outline for a project officer role",
    "What indicators matter in M&E for education projects?",
    "Prepare STAR answers for stakeholder management questions",
  ],
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { name: "Home", icon: "⌂", route: "/dashboard", dot: true },
      { name: "Profile", icon: "⦿", route: "/dashboard/profile" },
    ],
  },
  {
    label: "Career",
    items: [
      { name: "Jobs", icon: "☷", route: "/dashboard/jobs", badge: 3 },
      { name: "AI Career Coach", icon: "✦", route: "/dashboard/ai" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Tasks", icon: "≡", route: "/dashboard/tasks", badge: 5 },
      { name: "Notifications", icon: "◎", route: "/dashboard/notifications", badge: 2 },
    ],
  },
];

export const sectionStatuses = [
  { label: "Basics", state: "done" as const },
  { label: "Skills", state: "done" as const },
  { label: "Experience", state: "partial" as const },
  { label: "Portfolio", state: "empty" as const },
];

export const sectionTabs = [
  { label: "Basics", state: "done" },
  { label: "Skills", state: "done" },
  { label: "Experience", state: "partial" },
  { label: "Education", state: "idle" },
  { label: "Portfolio", state: "idle" },
  { label: "Certifications", state: "idle" },
  { label: "Preferences", state: "idle" },
];

export const defaultProfileDraft: ProfileDraft = {
  username: "faarukh181",
  fullName: "",
  tagline: "",
  location: "Dhaka, Bangladesh",
  portfolioUrl: "https://chakri.ai/u/faarukh181",
  roles: "Frontend · Product Engineer",
  summary: "",
};
