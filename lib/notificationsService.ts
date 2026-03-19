import { SupabaseClient } from "@supabase/supabase-js";
import { ActivityLog, NotificationItem, NotificationType, SecurityEvent } from "@/types/notifications";

export async function getNotifications(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<NotificationItem[]>();
}

export async function createNotification(
  supabase: SupabaseClient,
  payload: Pick<NotificationItem, "user_id" | "type" | "title" | "message" | "link">
) {
  return supabase.from("notifications").insert(payload).select("*").single();
}

export async function markNotificationRead(supabase: SupabaseClient, id: string) {
  return supabase.from("notifications").update({ is_read: true }).eq("id", id).select("*").single();
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string) {
  return supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
}

export async function deleteNotification(supabase: SupabaseClient, id: string) {
  return supabase.from("notifications").delete().eq("id", id);
}

export async function logActivity(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    actor_role?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    severity?: "info" | "warning" | "critical";
    source?: string;
    metadata?: Record<string, unknown>;
  }
) {
  return supabase
    .from("activity_logs")
    .insert({
      user_id: payload.user_id,
      actor_role: payload.actor_role ?? "user",
      action: payload.action,
      resource_type: payload.resource_type ?? null,
      resource_id: payload.resource_id ?? null,
      severity: payload.severity ?? "info",
      source: payload.source ?? "app",
      metadata: payload.metadata ?? null,
    })
    .select("*")
    .single();
}

export async function getActivityLogsForAdmin(supabase: SupabaseClient, limit = 100) {
  return supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ActivityLog[]>();
}

export async function getActivityLogsForUser(supabase: SupabaseClient, userId: string, limit = 50) {
  return supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ActivityLog[]>();
}

export async function createSecurityEvent(
  supabase: SupabaseClient,
  payload: {
    user_id?: string | null;
    event_name: string;
    level?: "low" | "medium" | "high" | "critical";
    source?: string;
    status?: "open" | "acknowledged" | "resolved";
    details?: Record<string, unknown>;
  }
) {
  return supabase
    .from("security_events")
    .insert({
      user_id: payload.user_id ?? null,
      event_name: payload.event_name,
      level: payload.level ?? "low",
      source: payload.source ?? "app",
      status: payload.status ?? "open",
      details: payload.details ?? null,
    })
    .select("*")
    .single();
}

export async function getSecurityEventsForAdmin(supabase: SupabaseClient, limit = 100) {
  return supabase
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<SecurityEvent[]>();
}

export function getNotificationTypeLabel(type: NotificationType) {
  switch (type) {
    case "job":
      return "Job";
    case "task":
      return "Task";
    case "follow_up":
      return "Follow-up";
    default:
      return "System";
  }
}
