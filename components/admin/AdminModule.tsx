"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { getPendingJobPostsForAdmin, moderateJobPost } from "@/lib/jobsService";
import { createNotification, getActivityLogsForAdmin, getSecurityEventsForAdmin, logActivity } from "@/lib/notificationsService";
import { ActivityLog, SecurityEvent } from "@/types/notifications";
import { JobPost } from "@/types/jobs";

type AdminModuleProps = {
  secret: string;
};

export function AdminModule({ secret }: AdminModuleProps) {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pendingJobs, setPendingJobs] = useState<JobPost[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

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

    const configuredSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH;
    const configuredAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const signedInEmail = auth.user.email?.toLowerCase() ?? "";

    if (!configuredSecret || !configuredAdminEmail) {
      setLoading(false);
      setError("Admin access is not configured. Set NEXT_PUBLIC_ADMIN_SECRET_PATH and NEXT_PUBLIC_ADMIN_EMAIL.");
      return;
    }

    if (secret !== configuredSecret) {
      setLoading(false);
      setError(t("adminAccessDenied"));
      return;
    }

    if (signedInEmail !== configuredAdminEmail.toLowerCase()) {
      setLoading(false);
      setError(t("adminAccessDenied"));
      return;
    }

    const uid = auth.user.id;
    setUserId(uid);

    setIsAdmin(true);

    await reload();
    setLoading(false);
  }

  async function reload() {
    if (!supabase) return;

    const [pendingRes, logsRes, secRes] = await Promise.all([
      getPendingJobPostsForAdmin(supabase),
      getActivityLogsForAdmin(supabase, 80),
      getSecurityEventsForAdmin(supabase, 40),
    ]);

    setPendingJobs(pendingRes.data ?? []);
    setActivityLogs(logsRes.data ?? []);
    setSecurityEvents(secRes.data ?? []);
  }

  async function onModerate(jobId: string, status: "approved" | "rejected") {
    if (!supabase || !isAdmin || !userId) return;

    const targetJob = pendingJobs.find((job) => job.id === jobId);

    const { error: modError } = await moderateJobPost(supabase, jobId, status);
    if (modError) {
      setError(modError.message);
      return;
    }

    await logActivity(supabase, {
      user_id: userId,
      actor_role: "admin",
      action: `job_${status}`,
      resource_type: "job_post",
      resource_id: jobId,
      severity: status === "rejected" ? "warning" : "info",
      source: "admin",
      metadata: { status, title: targetJob?.title ?? null, company: targetJob?.company ?? null },
    });

    if (targetJob?.user_id) {
      await createNotification(supabase, {
        user_id: targetJob.user_id,
        type: "job",
        title: `Job post ${status}`,
        message: `Your job post \"${targetJob.title}\" was ${status} by admin review.`,
        link: "/dashboard/jobs",
      });
    }

    await reload();
  }

  const metrics = useMemo(() => {
    const criticalSecurity = securityEvents.filter((e) => e.level === "critical").length;
    return {
      pendingJobs: pendingJobs.length,
      activity: activityLogs.length,
      securityOpen: securityEvents.filter((e) => e.status === "open").length,
      criticalSecurity,
    };
  }, [pendingJobs, activityLogs, securityEvents]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  if (!isAdmin) {
    return <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">{t("adminAccessDenied")}</div>;
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin")}</h1>
        <p className="text-sm text-muted-foreground">{t("adminHint")}</p>
      </header>

      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label={t("pendingJobsMetric")} value={metrics.pendingJobs} />
        <MetricCard label={t("activityLogsMetric")} value={metrics.activity} />
        <MetricCard label={t("openSecurityMetric")} value={metrics.securityOpen} />
        <MetricCard label={t("criticalSecurityMetric")} value={metrics.criticalSecurity} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("adminModeration")}</h2>
        <div className="mt-3 space-y-2">
          {pendingJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyPendingModeration")}</p>
          ) : (
            pendingJobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{job.title} · {job.company}</p>
                <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void onModerate(job.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">{t("approve")}</button>
                  <button onClick={() => void onModerate(job.id, "rejected")} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white">{t("reject")}</button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("activityLogsTitle")}</h2>
        <div className="mt-3 space-y-2">
          {activityLogs.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyActivityLogs")}</p> : activityLogs.slice(0, 30).map((log) => (
            <article key={log.id} className="rounded border border-border p-2 text-sm">
              <p className="font-medium">{log.action} · {log.resource_type ?? "-"}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("securityEventsTitle")}</h2>
        <div className="mt-3 space-y-2">
          {securityEvents.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptySecurityEvents")}</p> : securityEvents.slice(0, 20).map((ev) => (
            <article key={ev.id} className="rounded border border-border p-2 text-sm">
              <p className="font-medium">{ev.event_name}</p>
              <p className="text-xs text-muted-foreground">{ev.level} · {ev.status} · {new Date(ev.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
