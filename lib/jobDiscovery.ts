import { Job, JobSourceType, UnifiedExperienceLevel, UnifiedJobCategory, UnifiedJobRecord, UnifiedJobType } from "@/types/jobs";

type DiscoveryQuery = {
  search?: string;
  location?: string;
  skill?: string;
  category?: string;
  sourceType?: string;
  includeInternal?: boolean;
  includeExternal?: boolean;
  page?: number;
  limit?: number;
};

type DiscoveryResult = {
  jobs: UnifiedJobRecord[];
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
  sourceHealth: {
    remotive: "ok" | "fallback" | "failed";
    arbeitnow: "ok" | "fallback" | "failed";
  };
};

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 40;
const FETCH_TIMEOUT_MS = 9000;

function nowIso() {
  return new Date().toISOString();
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function decodeHtmlEntities(input: string) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_match, entity: string) => {
    const value = entity.toLowerCase();

    if (value === "nbsp") return " ";
    if (value === "amp") return "&";
    if (value === "lt") return "<";
    if (value === "gt") return ">";
    if (value === "quot") return '"';
    if (value === "apos" || value === "#39") return "'";

    if (value.startsWith("#x")) {
      const codePoint = Number.parseInt(value.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    }

    if (value.startsWith("#")) {
      const codePoint = Number.parseInt(value.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    }

    return "";
  });
}

function stripHtml(input: string) {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr|td|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
}

function cleanText(input: string | null | undefined, fallback = "") {
  if (!input) return fallback;
  const initial = String(input);
  const withoutHtml = stripHtml(initial);
  const decoded = decodeHtmlEntities(withoutHtml);
  const decodedWithoutHtml = stripHtml(decoded);
  const normalized = decodedWithoutHtml.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function toDateIso(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function trimTo(input: string, max = 220) {
  const text = cleanText(input);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function sanitizeUrl(url: string | null | undefined) {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function parseStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(typeof item === "string" ? item : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => cleanText(item))
      .filter(Boolean);
  }

  return [];
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => normalize(value)))).filter(Boolean);
}

function inferCategory(title: string, description: string): UnifiedJobCategory {
  const blob = normalize(`${title} ${description}`);
  if (/frontend|backend|full ?stack|software|engineer|developer|devops|sre/.test(blob)) return "software";
  if (/data|analyst|ml|ai|science|business intelligence/.test(blob)) return "data";
  if (/designer|ux|ui|graphic|product design/.test(blob)) return "design";
  if (/marketing|seo|growth|brand|content/.test(blob)) return "marketing";
  if (/operations|supply|logistics|admin|hr/.test(blob)) return "operations";
  if (/finance|account|audit|bank|tax/.test(blob)) return "finance";
  if (/support|customer|service|success/.test(blob)) return "support";
  return "other";
}

function inferJobType(title: string, description: string, location: string | null): UnifiedJobType {
  const blob = normalize(`${title} ${description} ${location || ""}`);
  if (/intern/.test(blob)) return "internship";
  if (/part[- ]?time/.test(blob)) return "part-time";
  if (/contract|freelance/.test(blob)) return "contract";
  if (/hybrid/.test(blob)) return "hybrid";
  if (/remote|work from home|wfh/.test(blob)) return "remote";
  if (/on[- ]?site/.test(blob)) return "on-site";
  if (/full[- ]?time/.test(blob)) return "full-time";
  return "other";
}

function inferExperienceLevel(title: string, description: string): UnifiedExperienceLevel {
  const blob = normalize(`${title} ${description}`);
  if (/fresher|entry|entry[- ]level|graduate|0-1|0 to 1/.test(blob)) return "fresher";
  if (/junior|jr\.?|1-2|1 to 2/.test(blob)) return "junior";
  if (/mid|3-5|2-4|2 to 4/.test(blob)) return "mid";
  if (/senior|sr\.?|5\+|6\+|7\+/.test(blob)) return "senior";
  if (/lead|principal|staff|head/.test(blob)) return "lead";
  return "any";
}

function parseSkillsFromText(text: string) {
  const catalog = [
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "python",
    "sql",
    "postgresql",
    "aws",
    "docker",
    "kubernetes",
    "figma",
    "excel",
    "power bi",
    "tableau",
    "java",
    "c#",
    "go",
  ];

  const blob = normalize(text);
  return uniqueList(catalog.filter((skill) => blob.includes(skill))).slice(0, 20);
}

function toUnifiedStatus(isApproved: boolean, isActive: boolean) {
  if (!isActive) return "inactive" as const;
  return isApproved ? ("approved" as const) : ("pending" as const);
}

function isExpired(deadlineIso: string | null) {
  if (!deadlineIso) return false;
  return new Date(deadlineIso).getTime() < Date.now();
}

function normalizedFromInternal(job: Job): UnifiedJobRecord {
  const postedAt = toDateIso(job.created_at);
  const skills = uniqueList(parseStringList(job.required_skills));
  const shortDescription = trimTo(job.description || "");
  const fullDescription = cleanText(job.description || "");

  return {
    id: `internal:${job.id}`,
    title: cleanText(job.title, "Untitled role"),
    company: cleanText(job.company, "Unknown company"),
    location: cleanText(job.location || "") || null,
    category: inferCategory(job.title, job.description),
    job_type: inferJobType(job.title, job.description, job.location),
    experience_level: inferExperienceLevel(job.title, job.description),
    salary: null,
    short_description: shortDescription,
    full_description: fullDescription,
    requirements: [],
    responsibilities: [],
    skills,
    source: cleanText(job.source || "Internal Jobs"),
    source_type: job.source === "manual" ? "manual" : "internal",
    source_url: sanitizeUrl(job.source_url),
    apply_url: sanitizeUrl(job.source_url),
    posted_at: postedAt,
    deadline: null,
    is_active: job.status === "approved",
    is_approved: job.status === "approved",
    status: job.status,
    created_at: toDateIso(job.created_at) || nowIso(),
    updated_at: toDateIso(job.created_at) || nowIso(),
  };
}

type ExternalFetchState = {
  remotive: "ok" | "fallback" | "failed";
  arbeitnow: "ok" | "fallback" | "failed";
};

async function fetchJsonWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function mapRemotiveJob(raw: any): UnifiedJobRecord {
  const title = cleanText(raw?.title, "Untitled role");
  const company = cleanText(raw?.company_name, "Unknown company");
  const fullDescription = cleanText(raw?.description, "");
  const location = cleanText(raw?.candidate_required_location || "") || "Remote";
  const publishedAt = toDateIso(raw?.publication_date) || nowIso();
  const skills = uniqueList(parseStringList(raw?.tags ?? [])).slice(0, 24);
  const requirements = parseStringList(raw?.job_requirements || []);
  const responsibilities = parseStringList(raw?.job_responsibilities || []);

  return {
    id: `remotive:${String(raw?.id || `${title}-${company}`)}`,
    title,
    company,
    location,
    category: inferCategory(title, fullDescription),
    job_type: inferJobType(title, `${fullDescription} ${cleanText(raw?.job_type || "")}`, location),
    experience_level: inferExperienceLevel(title, fullDescription),
    salary: cleanText(raw?.salary || "") || null,
    short_description: trimTo(fullDescription || cleanText(raw?.description, "")),
    full_description: fullDescription,
    requirements,
    responsibilities,
    skills,
    source: "Remotive",
    source_type: "external_api",
    source_url: sanitizeUrl(raw?.url),
    apply_url: sanitizeUrl(raw?.url),
    posted_at: publishedAt,
    deadline: null,
    is_active: true,
    is_approved: true,
    status: "active",
    created_at: publishedAt,
    updated_at: publishedAt,
  };
}

function mapArbeitnowJob(raw: any): UnifiedJobRecord {
  const title = cleanText(raw?.title, "Untitled role");
  const company = cleanText(raw?.company_name, "Unknown company");
  const fullDescription = cleanText(raw?.description, "");
  const location = cleanText(raw?.location || "") || "Remote";
  const postedAt = toDateIso(raw?.created_at) || nowIso();
  const skills = uniqueList(parseStringList(raw?.tags ?? [])).slice(0, 24);

  return {
    id: `arbeitnow:${String(raw?.slug || `${title}-${company}`)}`,
    title,
    company,
    location,
    category: inferCategory(title, fullDescription),
    job_type: inferJobType(title, fullDescription, location),
    experience_level: inferExperienceLevel(title, fullDescription),
    salary: null,
    short_description: trimTo(fullDescription),
    full_description: fullDescription,
    requirements: [],
    responsibilities: [],
    skills,
    source: "Arbeitnow",
    source_type: "feed",
    source_url: sanitizeUrl(raw?.url),
    apply_url: sanitizeUrl(raw?.url),
    posted_at: postedAt,
    deadline: null,
    is_active: true,
    is_approved: true,
    status: "active",
    created_at: postedAt,
    updated_at: postedAt,
  };
}

function fallbackExternalJobs(): UnifiedJobRecord[] {
  const created = nowIso();
  const rows: Array<Partial<UnifiedJobRecord> & { id: string; title: string; company: string; full_description: string; apply_url: string }> = [
    {
      id: "fallback:frontend-engineer",
      title: "Frontend Engineer",
      company: "BanglaLabs",
      location: "Dhaka, Bangladesh",
      full_description:
        "Build modern React interfaces, collaborate with product and design, and ship accessible web experiences.",
      apply_url: "https://example.com/jobs/frontend-engineer",
      source: "Fallback Feed",
      source_type: "feed",
    },
    {
      id: "fallback:data-analyst",
      title: "Data Analyst",
      company: "Insightly BD",
      location: "Remote",
      full_description:
        "Analyze business data using SQL and Python. Build dashboards and provide practical insights to stakeholders.",
      apply_url: "https://example.com/jobs/data-analyst",
      source: "Fallback Feed",
      source_type: "feed",
    },
    {
      id: "fallback:backend-engineer",
      title: "Backend Engineer",
      company: "OrbitStack",
      location: "Dhaka / Hybrid",
      full_description:
        "Design APIs, optimize Postgres queries, and maintain scalable backend services with Node.js.",
      apply_url: "https://example.com/jobs/backend-engineer",
      source: "Fallback Feed",
      source_type: "feed",
    },
  ];

  return rows.map((item) => {
    const location = cleanText(item.location || "") || null;
    const fullDescription = cleanText(item.full_description);
    const title = cleanText(item.title);
    return {
      id: item.id,
      title,
      company: cleanText(item.company),
      location,
      category: inferCategory(title, fullDescription),
      job_type: inferJobType(title, fullDescription, location),
      experience_level: inferExperienceLevel(title, fullDescription),
      salary: null,
      short_description: trimTo(fullDescription),
      full_description: fullDescription,
      requirements: [],
      responsibilities: [],
      skills: parseSkillsFromText(fullDescription),
      source: item.source || "Fallback Feed",
      source_type: (item.source_type as JobSourceType) || "feed",
      source_url: sanitizeUrl(item.apply_url),
      apply_url: sanitizeUrl(item.apply_url),
      posted_at: created,
      deadline: null,
      is_active: true,
      is_approved: true,
      status: "active",
      created_at: created,
      updated_at: created,
    };
  });
}

async function fetchExternalJobs(query: DiscoveryQuery) {
  const search = cleanText(query.search || "");
  const state: ExternalFetchState = {
    remotive: "fallback",
    arbeitnow: "fallback",
  };

  const externalRows: UnifiedJobRecord[] = [];

  try {
    const remotiveUrl = `https://remotive.com/api/remote-jobs?limit=60${search ? `&search=${encodeURIComponent(search)}` : ""}`;
    const remotiveData = (await fetchJsonWithTimeout(remotiveUrl)) as { jobs?: unknown[] };
    if (Array.isArray(remotiveData.jobs)) {
      externalRows.push(...remotiveData.jobs.map((item) => mapRemotiveJob(item)));
      state.remotive = "ok";
    } else {
      state.remotive = "failed";
    }
  } catch {
    state.remotive = "failed";
  }

  try {
    const arbeitnowData = (await fetchJsonWithTimeout("https://www.arbeitnow.com/api/job-board-api")) as {
      data?: unknown[];
    };
    if (Array.isArray(arbeitnowData.data)) {
      externalRows.push(...arbeitnowData.data.slice(0, 80).map((item) => mapArbeitnowJob(item)));
      state.arbeitnow = "ok";
    } else {
      state.arbeitnow = "failed";
    }
  } catch {
    state.arbeitnow = "failed";
  }

  if (externalRows.length === 0) {
    externalRows.push(...fallbackExternalJobs());
    state.remotive = state.remotive === "ok" ? "ok" : "fallback";
    state.arbeitnow = state.arbeitnow === "ok" ? "ok" : "fallback";
  }

  return {
    rows: externalRows,
    state,
  };
}

function dedupeJobs(rows: UnifiedJobRecord[]) {
  const map = new Map<string, UnifiedJobRecord>();

  for (const row of rows) {
    const signature = [
      normalize(cleanText(row.apply_url || "")),
      normalize(cleanText(row.source_url || "")),
      normalize(cleanText(row.title)),
      normalize(cleanText(row.company)),
    ]
      .filter(Boolean)
      .join("|");

    if (!signature) continue;

    const existing = map.get(signature);
    if (!existing) {
      map.set(signature, row);
      continue;
    }

    const existingTime = Date.parse(existing.posted_at || existing.created_at || "") || 0;
    const nextTime = Date.parse(row.posted_at || row.created_at || "") || 0;
    if (nextTime >= existingTime) {
      map.set(signature, row);
    }
  }

  return Array.from(map.values());
}

function applyFilters(rows: UnifiedJobRecord[], query: DiscoveryQuery) {
  const search = normalize(query.search || "");
  const location = normalize(query.location || "");
  const skill = normalize(query.skill || "");
  const category = normalize(query.category || "");
  const sourceType = normalize(query.sourceType || "");

  return rows.filter((row) => {
    if (search) {
      const text = normalize(
        `${row.title} ${row.company} ${row.short_description} ${row.full_description} ${(row.skills || []).join(" ")}`
      );
      if (!text.includes(search)) return false;
    }

    if (location) {
      const target = normalize(row.location || "");
      if (!target.includes(location)) return false;
    }

    if (skill) {
      const hasSkill = (row.skills || []).some((item) => normalize(item).includes(skill));
      if (!hasSkill) return false;
    }

    if (category && row.category !== category) {
      return false;
    }

    if (sourceType && row.source_type !== sourceType) {
      return false;
    }

    return true;
  });
}

function paginate(rows: UnifiedJobRecord[], page: number, limit: number) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    slice: rows.slice(start, end),
    hasMore: end < rows.length,
  };
}

function sortNewestFirst(rows: UnifiedJobRecord[]) {
  return [...rows].sort((a, b) => {
    const aTs = Date.parse(a.posted_at || a.created_at || "") || 0;
    const bTs = Date.parse(b.posted_at || b.created_at || "") || 0;
    return bTs - aTs;
  });
}

export async function fetchUnifiedJobs(internalJobs: Job[], query: DiscoveryQuery = {}): Promise<DiscoveryResult> {
  const page = Math.max(1, Math.floor(query.page || 1));
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(query.limit || DEFAULT_LIMIT)));

  const includeInternal = query.includeInternal !== false;
  const includeExternal = query.includeExternal !== false;

  const internalRows = includeInternal ? internalJobs.map((job) => normalizedFromInternal(job)) : [];

  let externalRows: UnifiedJobRecord[] = [];
  let sourceHealth: DiscoveryResult["sourceHealth"] = {
    remotive: "fallback",
    arbeitnow: "fallback",
  };

  if (includeExternal) {
    const fetched = await fetchExternalJobs(query);
    externalRows = fetched.rows;
    sourceHealth = fetched.state;
  }

  const merged = dedupeJobs([
    ...internalRows,
    ...externalRows,
  ]).map((item) => {
    const expired = isExpired(item.deadline);
    const isActive = !expired && item.is_active;
    return {
      ...item,
      is_active: isActive,
      status: expired ? "expired" : item.status,
      updated_at: item.updated_at || item.created_at,
    };
  });

  const filtered = applyFilters(merged, query);
  const ordered = sortNewestFirst(filtered);
  const pageSet = paginate(ordered, page, limit);

  return {
    jobs: pageSet.slice,
    page,
    limit,
    hasMore: pageSet.hasMore,
    total: ordered.length,
    sourceHealth,
  };
}

export function unifiedToMatchableJob(job: UnifiedJobRecord): Job {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.full_description || job.short_description,
    required_skills: uniqueList(job.skills || []),
    experience_min: null,
    experience_max: null,
    source: job.source,
    source_url: job.source_url || job.apply_url,
    status: job.is_approved ? "approved" : "pending",
    created_by: null,
    created_at: job.created_at,
  };
}
