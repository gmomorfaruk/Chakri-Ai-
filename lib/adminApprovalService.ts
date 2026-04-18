import { SupabaseClient } from "@supabase/supabase-js";
import { AdminApprovalRequest, AdminApprovalStatus, AdminApprovalRequestType } from "@/types/admin";

export async function createApprovalRequest(
  supabase: SupabaseClient,
  payload: {
    requested_by: string;
    request_type: AdminApprovalRequestType;
    resource_type: string;
    resource_id?: string | null;
    title: string;
    summary?: string | null;
    payload?: Record<string, unknown>;
  }
) {
  return supabase
    .from("admin_approval_requests")
    .insert({
      requested_by: payload.requested_by,
      request_type: payload.request_type,
      resource_type: payload.resource_type,
      resource_id: payload.resource_id ?? null,
      title: payload.title,
      summary: payload.summary ?? null,
      payload: payload.payload ?? {},
      status: "pending",
    })
    .select("*")
    .single();
}

export async function getPendingApprovalRequestsForAdmin(supabase: SupabaseClient, limit = 60) {
  return supabase
    .from("admin_approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AdminApprovalRequest[]>();
}

export async function getApprovalRequestsForAdmin(supabase: SupabaseClient, limit = 120) {
  return supabase
    .from("admin_approval_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AdminApprovalRequest[]>();
}

export async function moderateApprovalRequest(
  supabase: SupabaseClient,
  payload: {
    id: string;
    status: AdminApprovalStatus;
    reviewed_by: string;
    review_note?: string | null;
  }
) {
  return supabase
    .from("admin_approval_requests")
    .update({
      status: payload.status,
      reviewed_by: payload.reviewed_by,
      review_note: payload.review_note ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .select("*")
    .single();
}
