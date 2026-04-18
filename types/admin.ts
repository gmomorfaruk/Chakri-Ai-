export type AdminApprovalStatus = "pending" | "approved" | "rejected";

export type AdminApprovalRequestType =
  | "profile_update"
  | "portfolio_publish"
  | "user_activity"
  | "job_application";

export interface AdminApprovalRequest {
  id: string;
  requested_by: string;
  request_type: AdminApprovalRequestType;
  resource_type: string;
  resource_id: string | null;
  title: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  status: AdminApprovalStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
