import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const location = (url.searchParams.get("location") || "").trim();
  const skill = (url.searchParams.get("skill") || "").trim();

  let query = supabase
    .from("jobs")
    .select("id,title,company,location,description,required_skills,experience_min,experience_max,source,source_url,status,created_by,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  if (skill) {
    query = query.overlaps("required_skills", [skill]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
