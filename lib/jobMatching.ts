export interface CareerDnaResult {
  score: number;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "have", "will", "your", "you",
  "our", "job", "role", "team", "work", "years", "year", "experience", "required", "preferred",
  "skills", "ability", "strong", "knowledge", "must", "good", "using", "into", "across", "within",
]);

const SKILL_CATALOG = [
  "javascript", "typescript", "react", "next.js", "node.js", "python", "java", "c++", "sql", "postgresql",
  "mongodb", "supabase", "firebase", "aws", "docker", "kubernetes", "git", "tailwind", "css", "html",
  "rest", "graphql", "testing", "jest", "cypress", "linux", "figma", "ui/ux", "communication",
  "problem solving", "data analysis", "excel", "power bi", "machine learning", "ai", "nlp", "prompt engineering",
  "leadership", "project management", "agile", "scrum", "api design", "security", "oauth", "authentication",
];

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function extractFallbackKeywords(text: string): string[] {
  return unique(
    normalize(text)
      .replace(/[^a-z0-9.\s/+_-]/g, " ")
      .split(" ")
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
      .slice(0, 12)
  );
}

export function analyzeCareerDnaMatch(jobDescription: string, profileSkills: string[]): CareerDnaResult {
  const jobText = normalize(jobDescription);
  const userSkillsNormalized = unique(profileSkills.map((skill) => normalize(skill)).filter(Boolean));

  const detectedCatalogSkills = SKILL_CATALOG.filter((skill) => jobText.includes(normalize(skill)));
  const detectedProfileSkillsFromJD = userSkillsNormalized.filter((skill) => jobText.includes(skill));

  let requiredSkills = unique([...detectedCatalogSkills, ...detectedProfileSkillsFromJD]);
  if (requiredSkills.length === 0) {
    requiredSkills = extractFallbackKeywords(jobText);
  }

  const matchedSkills = requiredSkills.filter((skill) => userSkillsNormalized.includes(skill));
  const missingSkills = requiredSkills.filter((skill) => !userSkillsNormalized.includes(skill));

  const base = requiredSkills.length || 1;
  const score = Math.min(100, Math.round((matchedSkills.length / base) * 100));

  const suggestions = missingSkills.slice(0, 6).map(
    (skill) => `Build one project and practice interview questions focused on ${skill}.`
  );

  return {
    score,
    requiredSkills,
    matchedSkills,
    missingSkills,
    suggestions,
  };
}
