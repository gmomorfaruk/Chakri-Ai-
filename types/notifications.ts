export type NotificationType = "job" | "task" | "follow_up" | "system";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  severity: "info" | "warning" | "critical";
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string | null;
  event_name: string;
  level: "low" | "medium" | "high" | "critical";
  source: string | null;
  status: "open" | "acknowledged" | "resolved";
  details: Record<string, unknown> | null;
  created_at: string;
}
