"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  createJobApplication,
  createJob,
  deleteJobApplication,
  generateFollowUpDraft,
  getApprovedJobs,
  getCurrentUserProfileRole,
  getMyJobApplications,
  getMyJobs,
  getPendingJobsForAdmin,
  moderateJob,
  updateJobApplicationFollowUpDraft,
  updateJobApplicationStatus,
} from "@/lib/jobsService";
import { createNotification, logActivity } from "@/lib/notificationsService";
import { JobMatchingPanel } from "@/components/jobs/JobMatchingPanel";
import { JobMatchesDisplay } from "@/components/jobs/JobMatchesDisplay";
import { Job, JobApplication, JobApplicationStatus, JobPost } from "@/types/jobs";

export function JobsModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hub" | "tracker" | "matching" | "matches">("hub");
  const [matchRefreshTrigger, setMatchRefreshTrigger] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");

  const [myPosts, setMyPosts] = useState<Job[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<Job[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  const [postForm, setPostForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    required_skills: "",
    experience_min: "",
    experience_max: "",
    source_url: "",
  });
  const [appForm, setAppForm] = useState({ role_title: "", company: "", status: "applied" as JobApplicationStatus, follow_up_date: "", notes: "" });

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

    setLoading(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setLoading(false);
      setError(t("profileAuthRequired"));
      return;
    }

    setUserId(authData.user.id);
    const currentRole = await getCurrentUserProfileRole(supabase, authData.user.id);
    setRole(currentRole === "admin" ? "admin" : "user");
    await reload(authData.user.id, currentRole === "admin");
    setLoading(false);
  }

  async function reload(uid: string, isAdmin: boolean) {
    if (!supabase) return;

    const [myPostsRes, approvedPostsRes, appsRes, pendingRes] = await Promise.all([
      getMyJobs(supabase, uid),
      getApprovedJobs(supabase),
      getMyJobApplications(supabase, uid),
      isAdmin ? getPendingJobsForAdmin(supabase) : Promise.resolve({ data: [] as Job[], error: null }),
    ]);

    setMyPosts(myPostsRes.data ?? []);
    setApprovedPosts(approvedPostsRes.data ?? []);
    setApplications(appsRes.data ?? []);
    setPendingPosts(pendingRes.data ?? []);
  }

  async function onCreatePost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!postForm.title.trim() || !postForm.company.trim() || !postForm.description.trim()) {
      setError(t("jobPostValidation"));
      return;
    }

    const requiredSkills = postForm.required_skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const expMin = postForm.experience_min ? Number(postForm.experience_min) : null;
    const expMax = postForm.experience_max ? Number(postForm.experience_max) : null;

    const { error: createError } = await createJob(supabase, {
      title: postForm.title.trim(),
      company: postForm.company.trim(),
      location: postForm.location.trim() || null,
      description: postForm.description.trim(),
      required_skills: requiredSkills,
      experience_min: Number.isFinite(expMin) ? expMin : null,
      experience_max: Number.isFinite(expMax) ? expMax : null,
      source: "manual",
      source_url: postForm.source_url.trim() || null,
      created_by: userId,
      status: "pending",
    });

    if (createError) {
      setError(createError.message);
      return;
    }

    await Promise.all([
      createNotification(supabase, {
        user_id: userId,
        type: "job",
        title: "Job post submitted",
        message: "Your job post is now pending admin approval.",
        link: "/dashboard/jobs",
      }),
      logActivity(supabase, {
        user_id: userId,
        actor_role: role,
        action: "job_post_submitted",
        resource_type: "job_post",
        severity: "info",
        source: "jobs_module",
      }),
    ]);

    setPostForm({
      title: "",
      company: "",
      location: "",
      description: "",
      required_skills: "",
      experience_min: "",
      experience_max: "",
      source_url: "",
    });
    await reload(userId, role === "admin");
  }

  async function onModerate(id: string, status: "approved" | "rejected") {
    if (!supabase || !userId || role !== "admin") return;

    const target = pendingPosts.find((p) => p.id === id);
    const { error: modError } = await moderateJob(supabase, id, status);
    if (modError) {
      setError(modError.message);
      return;
    }

    await logActivity(supabase, {
      user_id: userId,
      actor_role: "admin",
      action: `job_${status}`,
      resource_type: "job_post",
      resource_id: id,
      severity: status === "rejected" ? "warning" : "info",
      source: "jobs_module",
      metadata: { status },
    });

    if (target?.created_by) {
      await createNotification(supabase, {
        user_id: target.created_by,
        type: "job",
        title: `Job post ${status}`,
        message: `Your job post \"${target.title}\" was ${status}.`,
        link: "/dashboard/jobs",
      });
    }

    await reload(userId, true);
  }

  async function onCreateApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!appForm.role_title.trim() || !appForm.company.trim()) {
      setError(t("jobTrackerValidation"));
      return;
    }

    const { error: appError } = await createJobApplication(supabase, {
      user_id: userId,
      job_post_id: null,
      role_title: appForm.role_title.trim(),
      company: appForm.company.trim(),
      status: appForm.status,
      applied_at: new Date().toISOString().slice(0, 10),
      follow_up_date: appForm.follow_up_date || null,
      notes: appForm.notes.trim() || null,
      ai_followup_draft: null,
    });

    if (appError) {
      setError(appError.message);
      return;
    }

    await logActivity(supabase, {
      user_id: userId,
      actor_role: role,
      action: "job_application_added",
      resource_type: "job_application",
      severity: "info",
      source: "jobs_module",
      metadata: { role_title: appForm.role_title.trim(), company: appForm.company.trim() },
    });

    setAppForm({ role_title: "", company: "", status: "applied", follow_up_date: "", notes: "" });
    await reload(userId, role === "admin");
  }

  async function onStatusChange(id: string, status: JobApplicationStatus) {
    if (!supabase || !userId) return;
    const { error: statusError } = await updateJobApplicationStatus(supabase, id, status);
    if (statusError) {
      setError(statusError.message);
      return;
    }

    await logActivity(supabase, {
      user_id: userId,
      actor_role: role,
      action: "job_application_status_changed",
      resource_type: "job_application",
      resource_id: id,
      severity: "info",
      source: "jobs_module",
      metadata: { status },
    });

    await reload(userId, role === "admin");
  }

  async function onGenerateDraft(item: JobApplication) {
    if (!supabase || !userId) return;
    const draft = generateFollowUpDraft(item.role_title, item.company);
    const { error: draftError } = await updateJobApplicationFollowUpDraft(supabase, item.id, draft);
    if (draftError) {
      setError(draftError.message);
      return;
    }
    await reload(userId, role === "admin");
  }

  async function onDeleteApplication(id: string) {
    if (!supabase || !userId) return;
    const { error: delError } = await deleteJobApplication(supabase, id);
    if (delError) {
      setError(delError.message);
      return;
    }
    await reload(userId, role === "admin");
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  if (!userId) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error ?? t("profileAuthRequired")}</div>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t("jobs")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("jobsModuleHint")}</p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      <div className="flex gap-2">
        {[
          { id: "hub", label: t("jobHub") },
          { id: "tracker", label: t("jobTracker") },
          { id: "matching", label: t("jobMatching") },
          { id: "matches", label: "✨ Smart Matches" },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setActiveTab(btn.id as typeof activeTab)}
            className={`group relative px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 overflow-hidden ${
              activeTab === btn.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
            )}
            {activeTab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            <span className="relative">{btn.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "hub" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("postJob")}</h2>
            <form className="mt-4 grid gap-2 md:grid-cols-2" onSubmit={onCreatePost}>
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("jobTitle")} value={postForm.title} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("company")} value={postForm.company} onChange={(e) => setPostForm((p) => ({ ...p, company: e.target.value }))} />
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("location")} value={postForm.location} onChange={(e) => setPostForm((p) => ({ ...p, location: e.target.value }))} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("requiredSkills")} value={postForm.required_skills} onChange={(e) => setPostForm((p) => ({ ...p, required_skills: e.target.value }))} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("experienceMin")} value={postForm.experience_min} onChange={(e) => setPostForm((p) => ({ ...p, experience_min: e.target.value }))} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("experienceMax")} value={postForm.experience_max} onChange={(e) => setPostForm((p) => ({ ...p, experience_max: e.target.value }))} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("applyUrl")} value={postForm.source_url} onChange={(e) => setPostForm((p) => ({ ...p, source_url: e.target.value }))} />
              <textarea className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2" rows={4} placeholder={t("jobDescription")} value={postForm.description} onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))} />
              <button className="md:col-span-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t("submitForApproval")}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("myJobPosts")}</h2>
            <div className="mt-3 space-y-2">
              {myPosts.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyJobPosts")}</p> : myPosts.map((item) => (
                <article key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.title} · {item.company}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${item.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : item.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  {item.required_skills.length > 0 ? <p className="mt-1 text-xs text-muted-foreground">{item.required_skills.join(", ")}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("approvedJobs")}</h2>
            <div className="mt-3 space-y-2">
              {approvedPosts.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyApprovedJobs")}</p> : approvedPosts.map((item) => (
                <article key={item.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{item.title} · {item.company}</p>
                  {item.location ? <p className="text-sm text-muted-foreground">{item.location}</p> : null}
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  {item.required_skills.length > 0 ? <p className="mt-1 text-xs text-muted-foreground">{item.required_skills.join(", ")}</p> : null}
                  {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline mt-1 inline-block">{t("applyNow")}</a> : null}
                </article>
              ))}
            </div>
          </section>

          {role === "admin" ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">{t("adminModeration")}</h2>
              <div className="mt-3 space-y-2">
                {pendingPosts.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyPendingModeration")}</p> : pendingPosts.map((item) => (
                  <article key={item.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{item.title} · {item.company}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => onModerate(item.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">{t("approve")}</button>
                      <button onClick={() => onModerate(item.id, "rejected")} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white">{t("reject")}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : activeTab === "tracker" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("jobTracker")}</h2>
            <form className="mt-4 grid gap-2 md:grid-cols-2" onSubmit={onCreateApplication}>
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("jobTitle")} value={appForm.role_title} onChange={(e) => setAppForm((p) => ({ ...p, role_title: e.target.value }))} />
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("company")} value={appForm.company} onChange={(e) => setAppForm((p) => ({ ...p, company: e.target.value }))} />
              <select className="rounded-lg border border-border bg-background px-3 py-2" value={appForm.status} onChange={(e) => setAppForm((p) => ({ ...p, status: e.target.value as JobApplicationStatus }))}>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
              <input type="date" className="rounded-lg border border-border bg-background px-3 py-2" value={appForm.follow_up_date} onChange={(e) => setAppForm((p) => ({ ...p, follow_up_date: e.target.value }))} />
              <textarea className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2" rows={3} placeholder={t("notes")} value={appForm.notes} onChange={(e) => setAppForm((p) => ({ ...p, notes: e.target.value }))} />
              <button className="md:col-span-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t("addApplication")}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("myApplications")}</h2>
            <div className="mt-3 space-y-2">
              {applications.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyApplications")}</p> : applications.map((item) => {
                const showReminder = item.follow_up_date && item.follow_up_date <= today && !["offer", "rejected", "hired"].includes(item.status);
                return (
                  <article key={item.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.role_title} · {item.company}</p>
                      <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={item.status} onChange={(e) => void onStatusChange(item.id, e.target.value as JobApplicationStatus)}>
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                    </div>
                    {showReminder ? <p className="mt-2 text-xs text-amber-300">{t("followUpReminder")}: {item.follow_up_date}</p> : null}
                    {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                    {item.ai_followup_draft ? <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">{item.ai_followup_draft}</pre> : null}
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-lg border border-border px-3 py-1.5 text-sm" onClick={() => void onGenerateDraft(item)}>{t("generateFollowUpDraft")}</button>
                      <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400" onClick={() => void onDeleteApplication(item.id)}>{t("delete")}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : activeTab === "matching" ? (
        <JobMatchingPanel userId={userId!} approvedPosts={approvedPosts} onError={setError} />
      ) : activeTab === "matches" ? (
        <JobMatchesDisplay 
          refreshTrigger={matchRefreshTrigger}
          onError={setError} 
        />
      ) : null}
    </section>
  );
}
