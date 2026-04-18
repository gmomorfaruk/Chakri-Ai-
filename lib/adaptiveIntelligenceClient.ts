import { SupabaseClient } from "@supabase/supabase-js";
import { AdaptiveSyncRequest, AdaptiveSyncResponse } from "@/types/adaptiveIntelligence";

async function getAccessToken(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export async function fetchAdaptiveSnapshot(supabase: SupabaseClient | null) {
  if (!supabase) return null;

  const token = await getAccessToken(supabase);
  if (!token) return null;

  const response = await fetch("/api/intelligence/sync", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !payload || typeof payload !== "object" || !("profile" in payload) || !("context" in payload)) {
    return null;
  }

  return payload as AdaptiveSyncResponse;
}

export async function syncAdaptiveSignals(supabase: SupabaseClient | null, body: AdaptiveSyncRequest) {
  if (!supabase) return null;

  const token = await getAccessToken(supabase);
  if (!token) return null;

  const response = await fetch("/api/intelligence/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !payload || typeof payload !== "object" || !("profile" in payload) || !("context" in payload)) {
    return null;
  }

  return payload as AdaptiveSyncResponse;
}
