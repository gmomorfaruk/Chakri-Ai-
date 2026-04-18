const STORAGE_KEY = "chakri-ai:saved-jobs:v1";

function hasWindow() {
  return typeof window !== "undefined";
}

export function buildSavedJobKey(id: string, sourceType = "job") {
  return `${sourceType}:${id}`;
}

export function loadSavedJobs(): Set<string> {
  if (!hasWindow()) return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

export function saveSavedJobs(values: Set<string>) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(values)));
}

export function toggleSavedJob(values: Set<string>, key: string) {
  const next = new Set(values);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}
