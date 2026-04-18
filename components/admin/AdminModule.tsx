"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  getPendingJobPostsForAdmin,
  getPendingJobsForAdmin,
  moderateJobPost,
  moderateJob,
} from "@/lib/jobsService";
import {
  createNotification,
  getActivityLogsForAdmin,
  getSecurityEventsForAdmin,
  logActivity,
} from "@/lib/notificationsService";
import {
  getPendingApprovalRequestsForAdmin,
  moderateApprovalRequest,
} from "@/lib/adminApprovalService";
import { AdminApprovalRequest, AdminApprovalRequestType } from "@/types/admin";
import { Job, JobPost } from "@/types/jobs";
import { ActivityLog, SecurityEvent } from "@/types/notifications";
import {
  Activity,
  AlertTriangle,
  Ban,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";

type ModerationTarget = {
  id: string;
  source: "job_post" | "job";
  title: string;
  company: string;
  location: string | null;
  description: string;
  createdAt: string;
  postedBy: string | null;
  skills: string[];
  applyUrl?: string | null;
};

type ToastItem = {
  id: string;
  tone: "success" | "error";
  message: string;
};

type DashboardMetrics = {
  pendingJobs: number;
  pendingApprovals: number;
  approvedApprovals: number;
  rejectedApprovals: number;
  approvedJobs: number;
  rejectedJobs: number;
  totalUsers: number;
  activeApplications: number;
  securityAlerts: number;
};

const emptyMetrics: DashboardMetrics = {
  pendingJobs: 0,
  pendingApprovals: 0,
  approvedApprovals: 0,
  rejectedApprovals: 0,
  approvedJobs: 0,
  rejectedJobs: 0,
  totalUsers: 0,
  activeApplications: 0,
  securityAlerts: 0,
};

export function AdminModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [pendingPosts, setPendingPosts] = useState<JobPost[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<AdminApprovalRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [selectedJob, setSelectedJob] = useState<ModerationTarget | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function pushToast(message: string, tone: ToastItem["tone"]) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  }

  async function init() {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      setError(t("profileAuthRequired"));
      return;
    }

    const { data: profile, error: roleError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (roleError) {
      setLoading(false);
      setError(roleError.message);
      return;
    }

    if (profile?.role !== "admin") {
      setLoading(false);
      setError(t("adminAccessDenied"));
      return;
    }

    setUserId(auth.user.id);
    setIsAdmin(true);
    await reload(true);
    setLoading(false);
  }

  async function reload(isInitial = false) {
    if (!supabase) return;

    if (!isInitial) {
      setRefreshing(true);
    }

    const [
      pendingPostsRes,
      pendingJobsRes,
      logsRes,
      secRes,
      approvalsRes,
      approvedPostsCountRes,
      approvedJobsCountRes,
      rejectedPostsCountRes,
      rejectedJobsCountRes,
      approvedApprovalsCountRes,
      rejectedApprovalsCountRes,
      profilesCountRes,
      applicationsCountRes,
    ] = await Promise.all([
      getPendingJobPostsForAdmin(supabase),
      getPendingJobsForAdmin(supabase),
      getActivityLogsForAdmin(supabase, 80),
      getSecurityEventsForAdmin(supabase, 40),
      getPendingApprovalRequestsForAdmin(supabase, 80),
      supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("admin_approval_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("admin_approval_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("job_applications").select("*", { count: "exact", head: true }),
    ]);

    setPendingPosts(pendingPostsRes.data ?? []);
    setPendingJobs(pendingJobsRes.data ?? []);
    setApprovalRequests(approvalsRes.data ?? []);
    setActivityLogs(logsRes.data ?? []);
    setSecurityEvents(secRes.data ?? []);

    const openSecurityAlerts = (secRes.data ?? []).filter((event) => event.status === "open").length;
    setMetrics({
      pendingJobs: (pendingPostsRes.data?.length ?? 0) + (pendingJobsRes.data?.length ?? 0),
      pendingApprovals: approvalsRes.data?.length ?? 0,
      approvedApprovals: approvedApprovalsCountRes.count ?? 0,
      rejectedApprovals: rejectedApprovalsCountRes.count ?? 0,
      approvedJobs: (approvedPostsCountRes.count ?? 0) + (approvedJobsCountRes.count ?? 0),
      rejectedJobs: (rejectedPostsCountRes.count ?? 0) + (rejectedJobsCountRes.count ?? 0),
      totalUsers: profilesCountRes.count ?? 0,
      activeApplications: applicationsCountRes.count ?? 0,
      securityAlerts: openSecurityAlerts,
    });

    setRefreshing(false);
  }

  async function onModerate(target: ModerationTarget, status: "approved" | "rejected") {
    if (!supabase || !isAdmin || !userId) return;

    setBusyKey(`${target.source}:${target.id}:${status}`);
    setError(null);

    const moderationResult =
      target.source === "job_post"
        ? await moderateJobPost(supabase, target.id, status)
        : await moderateJob(supabase, target.id, status);

    if (moderationResult.error) {
      setError(moderationResult.error.message);
      pushToast(moderationResult.error.message, "error");
      setBusyKey(null);
      return;
    }

    await logActivity(supabase, {
      user_id: userId,
      actor_role: "admin",
      action: `job_${status}`,
      resource_type: target.source,
      resource_id: target.id,
      severity: status === "rejected" ? "warning" : "info",
      source: "admin",
      metadata: {
        status,
        title: target.title,
        company: target.company,
      },
    });

    if (target.source === "job_post") {
      const matchingPost = pendingPosts.find((post) => post.id === target.id);
      if (matchingPost?.user_id) {
        await createNotification(supabase, {
          user_id: matchingPost.user_id,
          type: "job",
          title: `Job post ${status}`,
          message: `Your job post "${target.title}" was ${status} by admin review.`,
          link: "/dashboard/jobs",
        });
      }
    }

    if (selectedJob?.id === target.id && selectedJob.source === target.source) {
      setSelectedJob(null);
    }

    pushToast(status === "approved" ? "Job Approved" : "Job Rejected", "success");
    await reload();
    setBusyKey(null);
  }

  async function onModerateApprovalRequest(request: AdminApprovalRequest, status: "approved" | "rejected") {
    if (!supabase || !isAdmin || !userId) return;

    setBusyKey(`approval:${request.id}:${status}`);
    setError(null);

    const { error: moderateError } = await moderateApprovalRequest(supabase, {
      id: request.id,
      status,
      reviewed_by: userId,
      review_note: status === "approved" ? "Approved from admin workspace" : "Rejected from admin workspace",
    });

    if (moderateError) {
      setError(moderateError.message);
      pushToast(moderateError.message, "error");
      setBusyKey(null);
      return;
    }

    if (request.request_type === "portfolio_publish") {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_public: status === "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.requested_by);

      if (profileError) {
        await logActivity(supabase, {
          user_id: userId,
          actor_role: "admin",
          action: "profile_visibility_sync_failed",
          resource_type: "profile",
          resource_id: request.requested_by,
          severity: "warning",
          source: "admin",
          metadata: {
            request_id: request.id,
            error: profileError.message,
            target_status: status,
          },
        });

        pushToast("Approval saved, but profile visibility update failed", "error");
      }
    }

    const typeLabel = getApprovalTypeLabel(request.request_type);
    const approvalLink =
      request.request_type === "job_application"
        ? "/dashboard/jobs"
        : request.request_type === "portfolio_publish"
        ? "/dashboard/portfolio"
        : "/dashboard/profile";

    await Promise.allSettled([
      createNotification(supabase, {
        user_id: request.requested_by,
        type: request.request_type === "job_application" ? "job" : "system",
        title: `${typeLabel} ${status}`,
        message:
          status === "approved"
            ? `Your ${typeLabel.toLowerCase()} request was approved by the admin team.`
            : `Your ${typeLabel.toLowerCase()} request was rejected by the admin team.`,
        link: approvalLink,
      }),
      logActivity(supabase, {
        user_id: userId,
        actor_role: "admin",
        action: `approval_request_${status}`,
        resource_type: request.resource_type,
        resource_id: request.resource_id ?? request.id,
        severity: status === "approved" ? "info" : "warning",
        source: "admin",
        metadata: {
          request_id: request.id,
          request_type: request.request_type,
          requested_by: request.requested_by,
          request_title: request.title,
        },
      }),
    ]);

    pushToast(`${typeLabel} ${status}`, "success");
    await reload();
    setBusyKey(null);
  }

  const moderationQueue = useMemo<ModerationTarget[]>(() => {
    const postTargets = pendingPosts.map((post) => ({
      id: post.id,
      source: "job_post" as const,
      title: post.title,
      company: post.company,
      location: post.location,
      description: post.description,
      createdAt: post.created_at,
      postedBy: post.user_id,
      skills: deriveSkillTags(post.title, post.description),
      applyUrl: post.apply_url,
    }));

    const jobTargets = pendingJobs.map((job) => ({
      id: job.id,
      source: "job" as const,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      createdAt: job.created_at,
      postedBy: job.created_by,
      skills: job.required_skills?.length
        ? job.required_skills.slice(0, 4)
        : deriveSkillTags(job.title, job.description),
      applyUrl: job.source_url,
    }));

    return [...postTargets, ...jobTargets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [pendingPosts, pendingJobs]);

  const groupedActivity = useMemo(() => groupLogsByDay(activityLogs.slice(0, 24)), [activityLogs]);

  const securitySummary = useMemo(() => {
    const openAlerts = securityEvents.filter((item) => item.status === "open").length;
    const criticalThreats = securityEvents.filter((item) => item.level === "critical").length;
    const failedLogins = securityEvents.filter((item) => matchesKeywords(item.event_name, ["failed", "login", "auth"])).length;
    const suspiciousActivity = securityEvents.filter((item) =>
      matchesKeywords(item.event_name, ["suspicious", "threat", "anomaly", "blocked", "risk"])
    ).length;

    return { openAlerts, criticalThreats, failedLogins, suspiciousActivity };
  }, [securityEvents]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="h-10 w-72 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-xl bg-white/5" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="h-5 w-28 animate-pulse rounded-lg bg-white/10" />
              <div className="mt-6 h-10 w-20 animate-pulse rounded-xl bg-white/10" />
              <div className="mt-4 h-4 w-32 animate-pulse rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="h-6 w-52 animate-pulse rounded-xl bg-white/10" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="h-5 w-48 animate-pulse rounded-lg bg-white/10" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-white/5" />
                  <div className="mt-2 h-4 w-4/5 animate-pulse rounded-lg bg-white/5" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="h-6 w-40 animate-pulse rounded-xl bg-white/10" />
              <div className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="h-6 w-44 animate-pulse rounded-xl bg-white/10" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-[28px] border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
        {t("adminAccessDenied")}
      </div>
    );
  }

  return (
    <section className="relative space-y-6 pb-10 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_32%)]" />

      <header className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(10,15,30,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Admin Workspace
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Admin Control Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Monitor platform activity and moderate content with a high-visibility command view.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickStatusCard
              label="Moderation queue"
              value={`${metrics.pendingJobs + metrics.pendingApprovals} waiting`}
              description={refreshing ? "Refreshing queue..." : "Jobs and user approval requests"}
              tone="amber"
            />
            <QuickStatusCard
              label="Security posture"
              value={securitySummary.criticalThreats > 0 ? "Attention needed" : "Stable"}
              description={`${securitySummary.openAlerts} open alerts currently tracked`}
              tone={securitySummary.criticalThreats > 0 ? "red" : "emerald"}
            />
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Metrics Overview"
          title="Platform pulse at a glance"
          subtitle="The most important signals, surfaced in one premium control grid."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Pending Jobs"
            value={metrics.pendingJobs}
            detail={`${pendingPosts.length} direct posts · ${pendingJobs.length} imported roles`}
            trend={metrics.pendingJobs > 0 ? "Needs moderation" : "Queue is clear"}
            tone="amber"
            icon={<Clock3 className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending Approvals"
            value={metrics.pendingApprovals}
            detail="Profile, activity, and application requests waiting review"
            trend={metrics.pendingApprovals > 0 ? "Admin action required" : "Approval queue is clear"}
            tone="blue"
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            label="Approved Jobs"
            value={metrics.approvedJobs}
            detail="Published and visible to candidates"
            trend="Healthy catalog"
            tone="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <MetricCard
            label="Rejected Jobs"
            value={metrics.rejectedJobs}
            detail="Filtered during moderation review"
            trend="Quality control"
            tone="red"
            icon={<Ban className="h-5 w-5" />}
          />
          <MetricCard
            label="Resolved Approvals"
            value={metrics.approvedApprovals + metrics.rejectedApprovals}
            detail={`${metrics.approvedApprovals} approved · ${metrics.rejectedApprovals} rejected`}
            trend="Governance throughput"
            tone="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <MetricCard
            label="Total Users"
            value={metrics.totalUsers}
            detail="Profiles registered in the platform"
            trend="Community reach"
            tone="blue"
            icon={<UserRound className="h-5 w-5" />}
          />
          <MetricCard
            label="Active Applications"
            value={metrics.activeApplications}
            detail="Tracked candidate job applications"
            trend="Hiring activity"
            tone="violet"
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            label="Security Alerts"
            value={metrics.securityAlerts}
            detail="Open alerts requiring operator awareness"
            trend={securitySummary.criticalThreats > 0 ? "Critical events detected" : "Within normal range"}
            tone={securitySummary.criticalThreats > 0 ? "red" : "cyan"}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(10,15,30,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Moderation Panel
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Job moderation queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review pending postings, approve fast, reject clearly, and inspect details before action.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
              <Activity className="h-4 w-4 text-cyan-300" />
              {refreshing ? "Syncing moderation data..." : `${moderationQueue.length} items in queue`}
            </div>
          </div>

          {moderationQueue.length === 0 ? (
            <EmptyModerationState />
          ) : (
            <div className="mt-5 space-y-4">
              {moderationQueue.map((job) => (
                <ModerationJobCard
                  key={`${job.source}:${job.id}`}
                  job={job}
                  busyKey={busyKey}
                  onApprove={() => void onModerate(job, "approved")}
                  onReject={() => void onModerate(job, "rejected")}
                  onView={() => setSelectedJob(job)}
                />
              ))}
            </div>
          )}
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(10,15,30,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Governance Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Approval workflow queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                Moderate user profile, activity, and application requests from one place.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
              <Activity className="h-4 w-4 text-cyan-300" />
              {refreshing ? "Syncing approvals..." : `${approvalRequests.length} requests in queue`}
            </div>
          </div>

          {approvalRequests.length === 0 ? (
            <EmptyActivityState label="No pending approval requests." />
          ) : (
            <div className="mt-5 space-y-4">
              {approvalRequests.map((request) => (
                <ApprovalRequestCard
                  key={request.id}
                  request={request}
                  busyKey={busyKey}
                  onApprove={() => void onModerateApprovalRequest(request, "approved")}
                  onReject={() => void onModerateApprovalRequest(request, "rejected")}
                />
              ))}
            </div>
          )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,15,30,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-6">
            <div className="border-b border-white/10 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Platform timeline</h2>
              <p className="mt-1 text-sm text-slate-400">
                Moderation and operational events grouped by recent time windows.
              </p>
            </div>

            <div className="mt-5 space-y-6">
              {groupedActivity.length === 0 ? (
                <EmptyActivityState label={t("emptyActivityLogs")} />
              ) : (
                groupedActivity.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.items.map((log) => (
                        <TimelineItem key={log.id} log={log} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,15,30,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Security Panel
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Wazuh-ready security view</h2>
                <p className="mt-1 text-sm text-slate-400">
                  High-priority alert metrics designed for future SIEM integrations.
                </p>
              </div>
              <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SecurityCard
                label="Open Security Alerts"
                value={securitySummary.openAlerts}
                tone="amber"
                description="Unresolved items still visible to the admin team"
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <SecurityCard
                label="Critical Threats"
                value={securitySummary.criticalThreats}
                tone="red"
                description="Highest-severity events needing immediate attention"
                icon={<ShieldAlert className="h-5 w-5" />}
              />
              <SecurityCard
                label="Failed Logins"
                value={securitySummary.failedLogins}
                tone="yellow"
                description="Authentication failures observed across recent events"
                icon={<UserRound className="h-5 w-5" />}
              />
              <SecurityCard
                label="Suspicious Activity"
                value={securitySummary.suspiciousActivity}
                tone="cyan"
                description="Potential anomalies, risky behavior, or blocked actions"
                icon={<Eye className="h-5 w-5" />}
              />
            </div>

            <button className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-cyan-400/15 active:translate-y-0">
              View Security Details
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>

      {selectedJob ? (
        <JobDetailsModal
          job={selectedJob}
          busyKey={busyKey}
          onClose={() => setSelectedJob(null)}
          onApprove={() => void onModerate(selectedJob, "approved")}
          onReject={() => void onModerate(selectedJob, "rejected")}
        />
      ) : null}

      <div className="fixed bottom-5 right-5 z-50 space-y-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} tone={toast.tone} message={toast.message} />
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-400 md:text-base">{subtitle}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  trend,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  trend: string;
  icon: React.ReactNode;
  tone: "amber" | "emerald" | "red" | "blue" | "violet" | "cyan";
}) {
  const tones = {
    amber:
      "border-amber-400/20 from-amber-400/15 to-transparent text-amber-200 shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    emerald:
      "border-emerald-400/20 from-emerald-400/15 to-transparent text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.12)]",
    red:
      "border-rose-400/20 from-rose-400/15 to-transparent text-rose-200 shadow-[0_0_40px_rgba(244,63,94,0.12)]",
    blue:
      "border-sky-400/20 from-sky-400/15 to-transparent text-sky-200 shadow-[0_0_40px_rgba(56,189,248,0.12)]",
    violet:
      "border-violet-400/20 from-violet-400/15 to-transparent text-violet-200 shadow-[0_0_40px_rgba(139,92,246,0.12)]",
    cyan:
      "border-cyan-400/20 from-cyan-400/15 to-transparent text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.12)]",
  };

  return (
    <article
      className={`group rounded-[28px] border bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,15,30,0.82))] p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,15,30,0.9))] ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-white transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-sm text-slate-300">{detail}</p>
        <p className="text-xs font-medium text-slate-500">{trend}</p>
      </div>
    </article>
  );
}

function QuickStatusCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "amber" | "emerald" | "red";
}) {
  const toneClass = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    red: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  };

  return (
    <div className={`rounded-3xl border p-4 backdrop-blur-xl ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-75">{description}</p>
    </div>
  );
}

function ModerationJobCard({
  job,
  busyKey,
  onApprove,
  onReject,
  onView,
}: {
  job: ModerationTarget;
  busyKey: string | null;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const approving = busyKey === `${job.source}:${job.id}:approved`;
  const rejecting = busyKey === `${job.source}:${job.id}:rejected`;

  return (
    <article className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.06] hover:shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {job.source === "job_post" ? "User Post" : "Imported Job"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {formatTimeAgo(job.createdAt)}
            </span>
          </div>

          <h3 className="mt-4 text-xl font-semibold text-white">{job.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>{job.company}</span>
            <span>{job.location || "Location not specified"}</span>
            <span>Posted by {shortId(job.postedBy)}</span>
          </div>

          <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-300">
            {job.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:w-[290px] xl:justify-end">
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {approving ? "Approving..." : "Approve"}
          </button>
          <button
            onClick={onReject}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-400/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {rejecting ? "Rejecting..." : "Reject"}
          </button>
          <button
            onClick={onView}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] active:translate-y-0"
          >
            <Eye className="h-4 w-4" />
            View details
          </button>
        </div>
      </div>
    </article>
  );
}

function ApprovalRequestCard({
  request,
  busyKey,
  onApprove,
  onReject,
}: {
  request: AdminApprovalRequest;
  busyKey: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const approving = busyKey === `approval:${request.id}:approved`;
  const rejecting = busyKey === `approval:${request.id}:rejected`;

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.06] hover:shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
          {getApprovalTypeLabel(request.request_type)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-400">
          {formatTimeAgo(request.created_at)}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white">{request.title}</h3>
      <p className="mt-2 text-sm text-slate-300">{request.summary || "No summary provided"}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
        {request.resource_type} · requested by {shortId(request.requested_by)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onApprove}
          disabled={approving || rejecting}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {approving ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={onReject}
          disabled={approving || rejecting}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-400/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          {rejecting ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </article>
  );
}

function EmptyModerationState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
          <CheckCircle2 className="h-11 w-11 text-emerald-300" />
        </div>
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-white">No jobs pending review 🎉</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">You&apos;re all caught up!</p>
    </div>
  );
}

function EmptyActivityState({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function TimelineItem({ log }: { log: ActivityLog }) {
  const visual = getActivityVisual(log);

  return (
    <article
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-4 pl-5 transition-all duration-300 hover:bg-white/[0.06] ${visual.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-2xl border border-white/10 p-2 ${visual.iconBg}`}>
          {visual.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{visual.title}</h3>
            <span className="text-xs text-slate-500">{formatTimeAgo(log.created_at)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-300">{visual.description}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            {log.resource_type || "system"} · {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </article>
  );
}

function SecurityCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: "amber" | "red" | "yellow" | "cyan";
}) {
  const styles = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    red: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-100",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  };

  return (
    <article className={`rounded-3xl border p-4 backdrop-blur-xl ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-2.5">{icon}</div>
      </div>
      <p className="mt-4 text-sm opacity-80">{description}</p>
    </article>
  );
}

function JobDetailsModal({
  job,
  busyKey,
  onClose,
  onApprove,
  onReject,
}: {
  job: ModerationTarget;
  busyKey: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const approving = busyKey === `${job.source}:${job.id}:approved`;
  const rejecting = busyKey === `${job.source}:${job.id}:rejected`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(10,15,30,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {job.source === "job_post" ? "User-submitted job post" : "Imported jobs table record"}
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-white">{job.title}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {job.company} · {job.location || "Location not specified"} · Posted by {shortId(job.postedBy)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.08]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Full description</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">{job.description}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Signal tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Job metadata</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Created</span>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Source</span>
                  <span>{job.source === "job_post" ? "Job Posts" : "Jobs Table"}</span>
                </div>
                {job.applyUrl ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">External URL</span>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-cyan-300 hover:text-cyan-200"
                    >
                      Open link
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5">
          <button
            onClick={onReject}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-400/15 active:translate-y-0 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {rejecting ? "Rejecting..." : "Reject"}
          </button>
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400/15 active:translate-y-0 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {approving ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ tone, message }: { tone: "success" | "error"; message: string }) {
  const style =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/12 text-emerald-100"
      : "border-rose-400/20 bg-rose-400/12 text-rose-100";

  return (
    <div className={`min-w-[220px] rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_16px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl ${style}`}>
      {message}
    </div>
  );
}

function deriveSkillTags(title: string, description: string): string[] {
  const fromTitle = `${title} ${description}`
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 3)
    .filter((item) => !COMMON_WORDS.has(item.toLowerCase()));

  return Array.from(new Set(fromTitle)).slice(0, 4);
}

const COMMON_WORDS = new Set([
  "with",
  "from",
  "that",
  "have",
  "will",
  "your",
  "role",
  "team",
  "work",
  "jobs",
  "post",
  "job",
  "looking",
  "need",
  "this",
  "into",
  "must",
  "years",
  "year",
  "their",
  "company",
  "bangladesh",
]);

function matchesKeywords(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getApprovalTypeLabel(type: AdminApprovalRequestType) {
  switch (type) {
    case "profile_update":
      return "Profile update";
    case "portfolio_publish":
      return "Portfolio publish";
    case "job_application":
      return "Job application";
    case "user_activity":
    default:
      return "User activity";
  }
}

function shortId(value: string | null) {
  if (!value) return "system";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTimeAgo(input: string) {
  const now = Date.now();
  const target = new Date(input).getTime();
  const diffMs = Math.max(0, now - target);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString();
}

function groupLogsByDay(logs: ActivityLog[]) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const groups = new Map<string, ActivityLog[]>();

  for (const log of logs) {
    const date = new Date(log.created_at);
    let label = "Earlier";

    if (date.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    }

    groups.set(label, [...(groups.get(label) ?? []), log]);
  }

  return ["Today", "Yesterday", "Earlier"]
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label) ?? [] }));
}

function getActivityVisual(log: ActivityLog) {
  const action = log.action.toLowerCase();
  const metadata = log.metadata as Record<string, unknown> | null;
  const title =
    action === "job_approved"
      ? "Job Approved"
      : action === "job_rejected"
      ? "Job Rejected"
      : action.includes("application")
      ? "Application Submitted"
      : action
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

  const itemName =
    typeof metadata?.title === "string"
      ? metadata.title
      : typeof metadata?.company === "string"
      ? metadata.company
      : log.resource_type || "system event";

  if (action === "job_approved") {
    return {
      title,
      description: `${itemName} passed moderation and is now cleared for the platform.`,
      border: "border-l-4 border-l-emerald-400/60",
      iconBg: "bg-emerald-400/12 text-emerald-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (action === "job_rejected") {
    return {
      title,
      description: `${itemName} was rejected to protect listing quality and trust.`,
      border: "border-l-4 border-l-rose-400/60",
      iconBg: "bg-rose-400/12 text-rose-200",
      icon: <XCircle className="h-4 w-4" />,
    };
  }

  if (action.includes("application")) {
    return {
      title,
      description: `${itemName} generated a new application-related workflow event.`,
      border: "border-l-4 border-l-sky-400/60",
      iconBg: "bg-sky-400/12 text-sky-200",
      icon: <FileText className="h-4 w-4" />,
    };
  }

  return {
    title,
    description: `${itemName} created an operational event inside the admin activity stream.`,
    border: "border-l-4 border-l-violet-400/60",
    iconBg: "bg-violet-400/12 text-violet-200",
    icon: <Briefcase className="h-4 w-4" />,
  };
}
