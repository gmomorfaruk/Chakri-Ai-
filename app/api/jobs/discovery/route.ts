import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getApprovedJobs } from "@/lib/jobsService";
import { fetchUnifiedJobs } from "@/lib/jobDiscovery";
import { Job } from "@/types/jobs";

export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const location = (url.searchParams.get("location") || "").trim();
    const skill = (url.searchParams.get("skill") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    const sourceType = (url.searchParams.get("sourceType") || "").trim();
    const scope = (url.searchParams.get("scope") || "all").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(40, parseInt(url.searchParams.get("limit") || "12", 10)));

    const includeInternal = scope !== "external";
    const includeExternal = scope !== "internal";

    let approvedJobs: Job[] = [];
    if (includeInternal) {
      const { data, error } = await getApprovedJobs(supabase);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      approvedJobs = data ?? [];
    }

    const result = await fetchUnifiedJobs(approvedJobs, {
      search,
      location,
      skill,
      category,
      sourceType,
      includeInternal,
      includeExternal,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to discover jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
