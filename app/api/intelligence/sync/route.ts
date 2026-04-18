import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { readAdaptiveIntelligence, syncAdaptiveIntelligence } from "@/lib/adaptiveIntelligenceService";
import { AdaptiveSyncRequest } from "@/types/adaptiveIntelligence";

async function getUserFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  const supabase = await getSupabaseServerClient(token || undefined);

  if (!supabase) {
    return { supabase: null, userId: null, error: "Supabase not configured" as string | null };
  }

  try {
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        return { supabase, userId: user.id, error: null };
      }
    }

    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();

    if (cookieUser) {
      return { supabase, userId: cookieUser.id, error: null };
    }

    return { supabase, userId: null, error: "Unauthorized" as string | null };
  } catch {
    return { supabase, userId: null, error: "Unauthorized" as string | null };
  }
}

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);

  if (!auth.supabase) {
    return NextResponse.json({ error: auth.error || "Supabase not configured" }, { status: 500 });
  }

  if (!auth.userId) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  const result = await readAdaptiveIntelligence(auth.supabase, auth.userId);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error?.message || "Failed to read adaptive intelligence" }, { status: 500 });
  }

  return NextResponse.json(result.data);
}

export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);

  if (!auth.supabase) {
    return NextResponse.json({ error: auth.error || "Supabase not configured" }, { status: 500 });
  }

  if (!auth.userId) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  let body: AdaptiveSyncRequest;
  try {
    body = (await req.json()) as AdaptiveSyncRequest;
  } catch {
    body = {};
  }

  const result = await syncAdaptiveIntelligence(auth.supabase, auth.userId, body || {});
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error?.message || "Failed to sync adaptive intelligence" }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
