"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BriefcaseBusiness, Check, Circle, ClipboardCheck, Dot, Layers3, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useSearchParams } from "next/navigation";
import { syncAdaptiveSignals } from "@/lib/adaptiveIntelligenceClient";
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
import { createApprovalRequest } from "@/lib/adminApprovalService";
import { JobMatchingPanel } from "@/components/jobs/JobMatchingPanel";
import { JobMatchesDisplay } from "@/components/jobs/JobMatchesDisplay";
import { JobDetailsModal } from "@/components/jobs/JobDetailsModal";
import { UnifiedJobCard } from "@/components/jobs/UnifiedJobCard";
import { buildSavedJobKey, loadSavedJobs, saveSavedJobs, toggleSavedJob } from "@/lib/savedJobsStore";
import { Job, JobApplication, JobApplicationStatus, UnifiedJobRecord } from "@/types/jobs";

type DiscoveryApiResponse = {
  success?: boolean;
  jobs?: UnifiedJobRecord[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  error?: string;
};

function getInitialTab(tab: string | null): "hub" | "tracker" | "matching" | "matches" {
  if (tab === "tracker" || tab === "matching" || tab === "matches") {
    return tab;
  }

  return "hub";
}

export function JobsModule() {
  const { t } = useI18n();
  const supabase = useSupabase();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hub" | "tracker" | "matching" | "matches">(() => getInitialTab(searchParams.get("tab")));
  const matchRefreshTrigger = 0;

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");

  const [myPosts, setMyPosts] = useState<Job[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<Job[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showTrackerForm, setShowTrackerForm] = useState(false);
  const [externalJobs, setExternalJobs] = useState<UnifiedJobRecord[]>([]);
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [discoveryLocation, setDiscoveryLocation] = useState("");
  const [discoverySkill, setDiscoverySkill] = useState("");
  const [discoveryCategory, setDiscoveryCategory] = useState("");
  const [hubSegment, setHubSegment] = useState<"my-posts" | "approved" | "external" | "saved">("external");
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryHasMore, setDiscoveryHasMore] = useState(false);
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [selectedJobDetails, setSelectedJobDetails] = useState<UnifiedJobRecord | null>(null);
  const [matchingPrefillDescription, setMatchingPrefillDescription] = useState("");
  const [matchingPrefillJobId, setMatchingPrefillJobId] = useState("");
  const hasPrefetchedDiscoveryRef = useRef(false);
  const discoveryAbortControllerRef = useRef<AbortController | null>(null);
  const discoveryRequestKeyRef = useRef<string | null>(null);

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

  function getErrorMessage(errorValue: unknown, fallback: string) {
    if (errorValue instanceof Error && errorValue.message) {
      return errorValue.message;
    }
    if (typeof errorValue === "object" && errorValue !== null && "message" in errorValue) {
      const message = (errorValue as { message?: string }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    return fallback;
  }

  function isValidHttpUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function runMutation(action: () => Promise<void>, fallbackError: string) {
    if (isMutating) return;
    setIsMutating(true);
    setError(null);

    try {
      await action();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, fallbackError));
    } finally {
      setIsMutating(false);
    }
  }

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    return () => {
      discoveryAbortControllerRef.current?.abort();
      discoveryAbortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setSavedJobs(loadSavedJobs());
  }, []);

  useEffect(() => {
    saveSavedJobs(savedJobs);
  }, [savedJobs]);

  useEffect(() => {
    if (!supabase || !userId) return;

    void syncAdaptiveSignals(supabase, {
      signals: [
        {
          domain: "jobs",
          signalType: "saved_jobs_snapshot",
          metricValue: savedJobs.size,
          source: "jobs_module",
          payload: {
            savedJobsCount: savedJobs.size,
          },
        },
      ],
      summary: {
        jobs: {
          savedCount: savedJobs.size,
        },
      },
    });
  }, [savedJobs, supabase, userId]);

  async function init() {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError(t("profileAuthRequired"));
        return;
      }

      setUserId(authData.user.id);
      const currentRole = await getCurrentUserProfileRole(supabase, authData.user.id);
      setRole(currentRole === "admin" ? "admin" : "user");
      await reload(authData.user.id, currentRole === "admin");

      if (!hasPrefetchedDiscoveryRef.current) {
        hasPrefetchedDiscoveryRef.current = true;
        void loadDiscoveryJobs(1, true);
      }
    } catch (initError) {
      setError(getErrorMessage(initError, t("jobsModuleLoadFailed")));
    } finally {
      setLoading(false);
    }
  }

  function mapInternalToUnified(item: Job): UnifiedJobRecord {
    const now = item.created_at || new Date().toISOString();
    return {
      id: `internal:${item.id}`,
      title: item.title,
      company: item.company,
      location: item.location,
      category: "other",
      job_type: "full-time",
      experience_level: "any",
      salary: null,
      short_description: item.description.slice(0, 220),
      full_description: item.description,
      requirements: [],
      responsibilities: [],
      skills: item.required_skills || [],
      source: item.source || t("internalJobs"),
      source_type: item.source === "manual" ? "manual" : "internal",
      source_url: item.source_url,
      apply_url: item.source_url,
      posted_at: now,
      deadline: null,
      is_active: item.status === "approved",
      is_approved: item.status === "approved",
      status: item.status,
      created_at: now,
      updated_at: now,
    };
  }

  async function loadDiscoveryJobs(page = 1, reset = false) {
    const params = new URLSearchParams({
      scope: "all",
      page: String(page),
      limit: "12",
    });

    if (discoverySearch.trim()) params.set("search", discoverySearch.trim());
    if (discoveryLocation.trim()) params.set("location", discoveryLocation.trim());
    if (discoverySkill.trim()) params.set("skill", discoverySkill.trim());
    if (discoveryCategory.trim()) params.set("category", discoveryCategory.trim());

    const requestKey = `${page}|${reset ? "reset" : "append"}|${params.toString()}`;
    if (requestKey === discoveryRequestKeyRef.current && discoveryLoading) {
      return;
    }

    discoveryRequestKeyRef.current = requestKey;

    if (reset && discoveryAbortControllerRef.current) {
      discoveryAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    discoveryAbortControllerRef.current = controller;

    setDiscoveryLoading(true);

    try {
      const response = await fetch(`/api/jobs/discovery?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as DiscoveryApiResponse;

      if (!response.ok || !payload.jobs) {
        throw new Error(payload.error || t("externalJobsLoadFailed"));
      }

      setExternalJobs((prev) => {
        if (reset) return payload.jobs!;
        const map = new Map<string, UnifiedJobRecord>();
        [...prev, ...payload.jobs!].forEach((job) => {
          map.set(job.id, job);
        });
        return Array.from(map.values());
      });
      setDiscoveryPage(payload.page || page);
      setDiscoveryHasMore(Boolean(payload.hasMore));
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError(getErrorMessage(loadError, t("externalJobsLoadFailed")));
      if (reset) {
        setExternalJobs([]);
      }
    } finally {
      if (discoveryAbortControllerRef.current === controller) {
        discoveryAbortControllerRef.current = null;
      }
      setDiscoveryLoading(false);
    }
  }

  function onToggleSaveUnified(job: UnifiedJobRecord) {
    const key = buildSavedJobKey(job.id, "job");
    setSavedJobs((prev) => toggleSavedJob(prev, key));
  }

  async function onAddUnifiedToTracker(job: UnifiedJobRecord) {
    if (!supabase || !userId) return;

    await runMutation(async () => {
      const roleTitle = (job.title || "").trim();
      const companyName = (job.company || "").trim();

      if (!roleTitle || !companyName) {
        throw new Error(t("jobTrackerValidation"));
      }

      const { data: existing, error: existingError } = await supabase
        .from("job_applications")
        .select("id")
        .eq("user_id", userId)
        .eq("role_title", roleTitle)
        .eq("company", companyName)
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      if ((existing ?? []).length > 0) {
        throw new Error(t("jobAlreadyTracked"));
      }

      const { data: createdApp, error: appError } = await createJobApplication(supabase, {
        user_id: userId,
        job_post_id: null,
        role_title: roleTitle,
        company: companyName,
        status: "applied",
        applied_at: new Date().toISOString().slice(0, 10),
        follow_up_date: null,
        notes: `Imported from ${job.source}${job.apply_url ? `\nApply URL: ${job.apply_url}` : ""}`,
        ai_followup_draft: null,
      });

      if (appError) {
        throw appError;
      }

      if (createdApp?.id) {
        setApplications((prev) => {
          const alreadyExists = prev.some((app) => app.id === createdApp.id);
          if (alreadyExists) {
            return prev;
          }

          return [createdApp as JobApplication, ...prev];
        });
      }

      setActiveTab("tracker");
      setShowTrackerForm(false);

      void Promise.allSettled([
        logActivity(supabase, {
          user_id: userId,
          actor_role: role,
          action: "job_application_added_from_discovery",
          resource_type: "job_application",
          severity: "info",
          source: "jobs_module",
          metadata: {
            role_title: roleTitle,
            company: companyName,
            source: job.source,
            source_type: job.source_type,
          },
        }),
        createApprovalRequest(supabase, {
          requested_by: userId,
          request_type: "job_application",
          resource_type: "job_application",
          resource_id: createdApp?.id ?? null,
          title: "Job application submitted for admin review",
          summary: `${roleTitle} at ${companyName}`,
          payload: {
            source: job.source,
            source_type: job.source_type,
            role_title: roleTitle,
            company: companyName,
            status: "applied",
          },
        }),
        createApprovalRequest(supabase, {
          requested_by: userId,
          request_type: "user_activity",
          resource_type: "activity",
          title: "User activity: added discovered job to tracker",
          summary: `${roleTitle} at ${companyName}`,
          payload: {
            activity: "job_added_to_tracker",
            source: "jobs_module",
            job_title: roleTitle,
            company: companyName,
          },
        }),
        syncAdaptiveSignals(supabase, {
          signals: [
            {
              domain: "jobs",
              signalType: "job_added_to_tracker",
              metricValue: 1,
              source: "jobs_module",
              payload: {
                title: roleTitle,
                company: companyName,
                source: job.source,
                sourceType: job.source_type,
              },
            },
          ],
          summary: {
            jobs: {
              appliedIncrement: 1,
              savedCount: savedJobs.size,
            },
          },
        }),
      ]);
    }, t("failedAddJobTracker"));
  }

  function onApplyUnified(job: UnifiedJobRecord) {
    const target = job.apply_url || job.source_url;
    if (!target) {
      setError(t("applyUrlNotAvailable"));
      return;
    }

    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  }

  function onMatchUnified(job: UnifiedJobRecord) {
    setMatchingPrefillDescription(job.full_description || job.short_description || `${job.title} at ${job.company}`);
    setMatchingPrefillJobId(job.id);
    setActiveTab("matching");
  }

  async function reload(uid: string, isAdmin: boolean) {
    if (!supabase) return;

    const [myPostsRes, approvedPostsRes, appsRes, pendingRes] = await Promise.all([
      getMyJobs(supabase, uid),
      getApprovedJobs(supabase),
      getMyJobApplications(supabase, uid),
      isAdmin ? getPendingJobsForAdmin(supabase) : Promise.resolve({ data: [] as Job[], error: null }),
    ]);

    const firstError = myPostsRes.error || approvedPostsRes.error || appsRes.error || pendingRes.error;
    if (firstError) {
      throw firstError;
    }

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

    if (postForm.source_url.trim() && !isValidHttpUrl(postForm.source_url.trim())) {
      setError(t("jobPostValidationUrl"));
      return;
    }

    const requiredSkills = postForm.required_skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const expMinRaw = postForm.experience_min.trim();
    const expMaxRaw = postForm.experience_max.trim();
    const expMin = expMinRaw ? Number(expMinRaw) : null;
    const expMax = expMaxRaw ? Number(expMaxRaw) : null;

    if (expMinRaw && (!Number.isFinite(expMin) || expMin! < 0)) {
      setError(t("experienceMinInvalid"));
      return;
    }
    if (expMaxRaw && (!Number.isFinite(expMax) || expMax! < 0)) {
      setError(t("experienceMaxInvalid"));
      return;
    }
    if (expMin !== null && expMax !== null && expMin > expMax) {
      setError(t("experienceRangeInvalid"));
      return;
    }

    await runMutation(async () => {
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
        throw createError;
      }

      await Promise.allSettled([
        createNotification(supabase, {
          user_id: userId,
          type: "job",
          title: t("jobPostSubmitted"),
          message: t("jobPostPendingApproval"),
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
      setShowPostForm(false);
      await reload(userId, role === "admin");
    }, "Failed to create job post.");
  }

  async function onModerate(id: string, status: "approved" | "rejected") {
    if (!supabase || !userId || role !== "admin") return;
    if (typeof window !== "undefined" && !window.confirm(`${t("confirmModerateJobPost")} ${status}?`)) {
      return;
    }

    await runMutation(async () => {
      const target = pendingPosts.find((p) => p.id === id);
      const { error: modError } = await moderateJob(supabase, id, status);
      if (modError) {
        throw modError;
      }

      await Promise.allSettled([
        logActivity(supabase, {
          user_id: userId,
          actor_role: "admin",
          action: `job_${status}`,
          resource_type: "job_post",
          resource_id: id,
          severity: status === "rejected" ? "warning" : "info",
          source: "jobs_module",
          metadata: { status },
        }),
        target?.created_by
          ? createNotification(supabase, {
              user_id: target.created_by,
              type: "job",
              title: `Job post ${status}`,
              message: `Your job post \"${target.title}\" was ${status}.`,
              link: "/dashboard/jobs",
            })
          : Promise.resolve(),
      ]);

      await reload(userId, true);
    }, `Failed to ${status} job post.`);
  }

  async function onCreateApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!appForm.role_title.trim() || !appForm.company.trim()) {
      setError(t("jobTrackerValidation"));
      return;
    }

    if (appForm.follow_up_date && Number.isNaN(Date.parse(appForm.follow_up_date))) {
      setError(t("followUpDateInvalid"));
      return;
    }

    await runMutation(async () => {
      const { data: createdApp, error: appError } = await createJobApplication(supabase, {
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
        throw appError;
      }

      await Promise.allSettled([
        logActivity(supabase, {
          user_id: userId,
          actor_role: role,
          action: "job_application_added",
          resource_type: "job_application",
          severity: "info",
          source: "jobs_module",
          metadata: { role_title: appForm.role_title.trim(), company: appForm.company.trim() },
        }),
      ]);

      await createApprovalRequest(supabase, {
        requested_by: userId,
        request_type: "job_application",
        resource_type: "job_application",
        resource_id: createdApp?.id ?? null,
        title: "Manual job application submitted for admin review",
        summary: `${appForm.role_title.trim()} at ${appForm.company.trim()}`,
        payload: {
          role_title: appForm.role_title.trim(),
          company: appForm.company.trim(),
          status: appForm.status,
          follow_up_date: appForm.follow_up_date || null,
        },
      });

      await createApprovalRequest(supabase, {
        requested_by: userId,
        request_type: "user_activity",
        resource_type: "activity",
        title: "User activity: created manual job application",
        summary: `${appForm.role_title.trim()} at ${appForm.company.trim()}`,
        payload: {
          activity: "manual_job_application_created",
          source: "jobs_module",
          role_title: appForm.role_title.trim(),
          company: appForm.company.trim(),
        },
      });

      setAppForm({ role_title: "", company: "", status: "applied", follow_up_date: "", notes: "" });
      await reload(userId, role === "admin");

      void syncAdaptiveSignals(supabase, {
        signals: [
          {
            domain: "jobs",
            signalType: "job_application_created",
            metricValue: 1,
            source: "jobs_module",
            payload: {
              roleTitle: appForm.role_title.trim(),
              company: appForm.company.trim(),
              status: appForm.status,
            },
          },
        ],
        summary: {
          jobs: {
            appliedIncrement: 1,
            savedCount: savedJobs.size,
          },
        },
      });
    }, "Failed to create job application.");
  }

  async function onStatusChange(id: string, status: JobApplicationStatus) {
    if (!supabase || !userId) return;

    await runMutation(async () => {
      const { error: statusError } = await updateJobApplicationStatus(supabase, id, status);
      if (statusError) {
        throw statusError;
      }

      await Promise.allSettled([
        logActivity(supabase, {
          user_id: userId,
          actor_role: role,
          action: "job_application_status_changed",
          resource_type: "job_application",
          resource_id: id,
          severity: "info",
          source: "jobs_module",
          metadata: { status },
        }),
      ]);

      await createApprovalRequest(supabase, {
        requested_by: userId,
        request_type: "user_activity",
        resource_type: "job_application",
        resource_id: id,
        title: "User activity: application status changed",
        summary: `Application moved to ${status}`,
        payload: {
          activity: "job_application_status_changed",
          status,
        },
      });

      await reload(userId, role === "admin");

      void syncAdaptiveSignals(supabase, {
        signals: [
          {
            domain: "jobs",
            signalType: "job_application_status_changed",
            metricValue: status === "offer" ? 100 : status === "interview" ? 70 : status === "rejected" ? 0 : 40,
            source: "jobs_module",
            payload: {
              status,
              applicationId: id,
            },
          },
        ],
        summary: {
          jobs: {
            savedCount: savedJobs.size,
          },
        },
      });
    }, "Failed to update application status.");
  }

  async function onGenerateDraft(item: JobApplication) {
    if (!supabase || !userId) return;

    await runMutation(async () => {
      const draft = generateFollowUpDraft(item.role_title, item.company);
      const { error: draftError } = await updateJobApplicationFollowUpDraft(supabase, item.id, draft);
      if (draftError) {
        throw draftError;
      }
      await reload(userId, role === "admin");
    }, "Failed to generate follow-up draft.");
  }

  async function onDeleteApplication(id: string) {
    if (!supabase || !userId) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this application?")) {
      return;
    }

    await runMutation(async () => {
      const { error: delError } = await deleteJobApplication(supabase, id);
      if (delError) {
        throw delError;
      }
      await reload(userId, role === "admin");
    }, "Failed to delete application.");
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const externalFilterLocations = useMemo(
    () => Array.from(new Set(externalJobs.map((job) => job.location).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b)),
    [externalJobs]
  );

  const externalFilterSkills = useMemo(
    () => Array.from(new Set(externalJobs.flatMap((job) => job.skills || []))).sort((a, b) => a.localeCompare(b)),
    [externalJobs]
  );

  const savedDiscoveryJobs = useMemo(
    () => externalJobs.filter((job) => savedJobs.has(buildSavedJobKey(job.id, "job"))),
    [externalJobs, savedJobs]
  );

  const matchingJobs = useMemo(() => {
    const rows = [
      ...approvedPosts,
      ...externalJobs.map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        description: item.full_description || item.short_description,
        required_skills: item.skills || [],
        experience_min: null,
        experience_max: null,
        source: item.source,
        source_url: item.source_url || item.apply_url,
        status: "approved" as const,
        created_by: null,
        created_at: item.created_at,
      })),
    ];

    const seen = new Set<string>();
    return rows.filter((job) => {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [approvedPosts, externalJobs]);

  if (loading) {
    return (
      <div className="ui-skeleton rounded-2xl p-6">
        <div className="space-y-3">
          <div className="ui-skeleton-line h-6 w-1/3" />
          <div className="ui-skeleton-line w-2/3" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="ui-skeleton h-28" />
          <div className="ui-skeleton h-28" />
          <div className="ui-skeleton h-28" />
        </div>
        <p className="mt-4 text-sm text-slate-400">{t("loading") || "Loading jobs workspace..."}</p>
      </div>
    );
  }

  if (!userId) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error ?? t("profileAuthRequired")}</div>;
  }

  return (
    <section className="space-y-5 overflow-x-hidden md:space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-card/60 p-2 lg:grid-cols-4">
        {[
          { id: "hub", label: t("jobHub") },
          { id: "tracker", label: t("jobTracker") },
          { id: "matching", label: t("jobMatching") },
          { id: "matches", label: `✨ ${t("smartMatches")}` },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setActiveTab(btn.id as typeof activeTab)}
            className={`group relative overflow-hidden rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-300 sm:px-4 sm:py-3 sm:text-sm ${
              activeTab === btn.id
                ? "text-primary-foreground shadow-lg shadow-primary/20"
                : "border border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {activeTab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
            )}
            {activeTab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            <span className="relative tracking-wide">{btn.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "hub" ? (
        <div className="space-y-6 md:space-y-7">
          <section className="relative overflow-hidden rounded-[30px] border border-border/60 bg-gradient-to-br from-card via-card/95 to-background/85 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.35)] sm:p-5 md:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("hiringCommandCenter")}
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                  {t("jobsHeroTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("jobsHeroBody")}
                </p>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
                {[
                  { label: t("myPostsLabel"), value: myPosts.length, icon: <BriefcaseBusiness className="h-4 w-4" />, tone: "text-cyan-300" },
                  { label: t("approvedLabel"), value: approvedPosts.length, icon: <ClipboardCheck className="h-4 w-4" />, tone: "text-emerald-300" },
                  { label: t("applicationsLabel"), value: applications.length, icon: <BarChart3 className="h-4 w-4" />, tone: "text-amber-300" },
                  {
                    label: role === "admin" ? t("pendingLabel") : t("awaitingReviewLabel"),
                    value: role === "admin" ? pendingPosts.length : myPosts.filter((post) => post.status === "pending").length,
                    icon: <Layers3 className="h-4 w-4" />,
                    tone: "text-violet-300",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-background/65 px-3.5 py-3">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="text-primary">{item.icon}</span>
                    </div>
                    <p className={`mt-1 text-2xl font-bold ${item.tone}`} style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border/50 bg-gradient-to-br from-card via-card/95 to-card/80 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm sm:p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("employerDesk")}
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t("postJob")}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("postJobHelper")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPostForm((current) => !current)}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-primary/30"
              >
                {showPostForm ? t("closeForm") : t("postJob")}
              </button>
            </div>

            {showPostForm ? (
              <form className="mt-6 grid gap-3 sm:gap-4 md:mt-8 md:grid-cols-2" onSubmit={onCreatePost}>
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("jobTitle")}
                  value={postForm.title}
                  onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))}
                />
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("company")}
                  value={postForm.company}
                  onChange={(e) => setPostForm((p) => ({ ...p, company: e.target.value }))}
                />
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("location")}
                  value={postForm.location}
                  onChange={(e) => setPostForm((p) => ({ ...p, location: e.target.value }))}
                />
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("requiredSkills")}
                  value={postForm.required_skills}
                  onChange={(e) => setPostForm((p) => ({ ...p, required_skills: e.target.value }))}
                />
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("experienceMin")}
                  value={postForm.experience_min}
                  onChange={(e) => setPostForm((p) => ({ ...p, experience_min: e.target.value }))}
                />
                <input
                  className="rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("experienceMax")}
                  value={postForm.experience_max}
                  onChange={(e) => setPostForm((p) => ({ ...p, experience_max: e.target.value }))}
                />
                <input
                  className="md:col-span-2 rounded-2xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder={t("applyUrl")}
                  value={postForm.source_url}
                  onChange={(e) => setPostForm((p) => ({ ...p, source_url: e.target.value }))}
                />
                <textarea
                  className="md:col-span-2 min-h-[160px] rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:min-h-[180px]"
                  rows={6}
                  placeholder={t("jobDescription")}
                  value={postForm.description}
                  onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))}
                />
                <div className="md:col-span-2 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {t("professionalListingReviewNotice")}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPostForm(false)}
                      className="rounded-2xl border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t("cancel")}
                    </button>
                    <button className="rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]">
                      {t("submitForApproval")}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-border/70 bg-background/30 p-4 sm:mt-8 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t("readyToPublishRole")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("publishRoleHint")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPostForm(true)}
                    className="inline-flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/15"
                  >
                    {t("openPostForm")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-[0_14px_32px_rgba(2,6,23,0.24)] sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{t("myJobPosts")}</h2>
              <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {myPosts.length} total
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {myPosts.length === 0 ? (
                <div className="ui-empty-state">
                  <p className="text-sm">{t("emptyJobPosts")}</p>
                  <button
                    type="button"
                    onClick={() => setShowPostForm(true)}
                    className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {t("createFirstPost")}
                  </button>
                </div>
              ) : myPosts.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-3.5 transition hover:border-primary/25 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold tracking-tight text-sm sm:text-base">{item.title} · {item.company}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${item.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : item.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  {item.required_skills.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">Skills: {item.required_skills.join(", ")}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-[0_14px_32px_rgba(2,6,23,0.24)] sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{t("approvedJobs")}</h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-300">
                {approvedPosts.length} live
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {approvedPosts.length === 0 ? (
                <div className="ui-empty-state">
                  <p className="text-sm">{t("emptyApprovedJobs")}</p>
                  <button
                    type="button"
                    onClick={() => setHubSegment("external")}
                    className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {t("browseExternalJobs")}
                  </button>
                </div>
              ) : approvedPosts.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-3.5 transition hover:border-primary/25 sm:p-4">
                  <p className="font-semibold tracking-tight text-sm sm:text-base">{item.title} · {item.company}</p>
                  {item.location ? <p className="text-sm text-muted-foreground">{item.location}</p> : null}
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  {item.required_skills.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">Skills: {item.required_skills.join(", ")}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.source_url ? (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15">
                          {t("applyNow")}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void onAddUnifiedToTracker(mapInternalToUnified(item))}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
                      >
                        {t("trackApplication")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSaveUnified(mapInternalToUnified(item))}
                        className="rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/35"
                      >
                        {savedJobs.has(buildSavedJobKey(`internal:${item.id}`, "job")) ? t("saved") : t("saveForLater")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onMatchUnified(mapInternalToUnified(item))}
                        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/15"
                      >
                        {t("matchMe")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetails(mapInternalToUnified(item))}
                        className="rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/35"
                      >
                        {t("openDetails")}
                      </button>
                    </div>
                </article>
              ))}
            </div>
          </section>

            <section className="rounded-[28px] border border-border/60 bg-gradient-to-br from-card via-card/95 to-background/85 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("jobDiscoveryKicker")}
                  </div>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                    {t("unifiedJobDiscoveryHub")}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("unifiedJobDiscoveryHint")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-background/60 p-2 lg:grid-cols-4">
                  {[
                    { id: "my-posts", label: t("myPostsLabel") },
                    { id: "approved", label: t("approvedJobs") },
                    { id: "external", label: t("externalCirculars") },
                    { id: "saved", label: t("savedJobs") },
                  ].map((segment) => (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => setHubSegment(segment.id as typeof hubSegment)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        hubSegment === segment.id
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25"
                          : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {segment.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-5">
                <input
                  value={discoverySearch}
                  onChange={(e) => setDiscoverySearch(e.target.value)}
                  placeholder={t("searchTitleCompanySkills")}
                  className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary/40 md:col-span-2"
                />
                <select
                  value={discoveryLocation}
                  onChange={(e) => setDiscoveryLocation(e.target.value)}
                  className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary/40"
                >
                  <option value="">{t("allLocations")}</option>
                  {externalFilterLocations.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={discoverySkill}
                  onChange={(e) => setDiscoverySkill(e.target.value)}
                  className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary/40"
                >
                  <option value="">{t("allSkills")}</option>
                  {externalFilterSkills.slice(0, 40).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void loadDiscoveryJobs(1, true)}
                    className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
                  >
                    {t("search")}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { value: "", label: t("allCategories") },
                  { value: "software", label: t("categorySoftware") },
                  { value: "data", label: t("categoryData") },
                  { value: "design", label: t("categoryDesign") },
                  { value: "marketing", label: t("categoryMarketing") },
                  { value: "operations", label: t("categoryOperations") },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setDiscoveryCategory(item.value);
                      void loadDiscoveryJobs(1, true);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      discoveryCategory === item.value
                        ? "border-primary/45 bg-primary/15 text-primary"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {hubSegment === "my-posts" ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                  {myPosts.length} {t("hubMyPostsSummary")}
                </div>
              ) : null}

              {hubSegment === "approved" ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                  {approvedPosts.length} {t("hubApprovedSummary")}
                </div>
              ) : null}

              {hubSegment === "saved" ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {savedDiscoveryJobs.length === 0 ? (
                    <div className="ui-empty-state">
                      <p className="text-sm">{t("hubNoSavedJobs")}</p>
                      <button
                        type="button"
                        onClick={() => setHubSegment("external")}
                        className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                      >
                        {t("exploreExternalCirculars")}
                      </button>
                    </div>
                  ) : (
                    savedDiscoveryJobs.map((job) => (
                      <UnifiedJobCard
                        key={job.id}
                        job={job}
                        saved={savedJobs.has(buildSavedJobKey(job.id, "job"))}
                        onViewDetails={setSelectedJobDetails}
                        onApplyNow={onApplyUnified}
                        onToggleSave={onToggleSaveUnified}
                        onAddToTracker={(item) => void onAddUnifiedToTracker(item)}
                        onMatchMe={onMatchUnified}
                      />
                    ))
                  )}
                </div>
              ) : null}

              {hubSegment === "external" ? (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {discoveryLoading && externalJobs.length === 0 ? (
                      <div className="ui-skeleton p-5">
                        <div className="space-y-3">
                          <div className="ui-skeleton-line h-5 w-2/3" />
                          <div className="ui-skeleton-line w-1/2" />
                        </div>
                        <p className="mt-4 text-sm text-slate-400">{t("hubLoadingExternalCirculars")}</p>
                      </div>
                    ) : externalJobs.length === 0 ? (
                      <div className="ui-empty-state">
                        <p className="text-sm">{t("hubNoExternalJobs")}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setDiscoverySearch("");
                            setDiscoveryLocation("");
                            setDiscoverySkill("");
                            setDiscoveryCategory("");
                            void loadDiscoveryJobs(1, true);
                          }}
                          className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                        >
                          {t("clearFiltersRetry")}
                        </button>
                      </div>
                    ) : (
                      externalJobs.map((job) => (
                        <UnifiedJobCard
                          key={job.id}
                          job={job}
                          saved={savedJobs.has(buildSavedJobKey(job.id, "job"))}
                          onViewDetails={setSelectedJobDetails}
                          onApplyNow={onApplyUnified}
                          onToggleSave={onToggleSaveUnified}
                          onAddToTracker={(item) => void onAddUnifiedToTracker(item)}
                          onMatchMe={onMatchUnified}
                        />
                      ))
                    )}
                  </div>

                  {discoveryHasMore ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        disabled={discoveryLoading}
                        onClick={() => void loadDiscoveryJobs(discoveryPage + 1, false)}
                        className="rounded-xl border border-border/60 bg-background/70 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 disabled:opacity-60"
                      >
                        {discoveryLoading ? t("loadingMoreJobs") : t("loadMoreResults")}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>

          {role === "admin" ? (
            <section className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-[0_14px_32px_rgba(2,6,23,0.24)] sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{t("adminModeration")}</h2>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-amber-300">
                  {pendingPosts.length} pending
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {pendingPosts.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyPendingModeration")}</p> : pendingPosts.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border/70 bg-background/60 p-3.5 sm:p-4">
                    <p className="font-semibold tracking-tight text-sm sm:text-base">{item.title} · {item.company}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button onClick={() => onModerate(item.id, "approved")} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500">{t("approve")}</button>
                      <button onClick={() => onModerate(item.id, "rejected")} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500">{t("reject")}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <JobDetailsModal
            job={selectedJobDetails}
            saved={selectedJobDetails ? savedJobs.has(buildSavedJobKey(selectedJobDetails.id, "job")) : false}
            onClose={() => setSelectedJobDetails(null)}
            onApplyNow={onApplyUnified}
            onToggleSave={onToggleSaveUnified}
            onAddToTracker={(job) => void onAddUnifiedToTracker(job)}
            onMatchMe={onMatchUnified}
          />
        </div>
      ) : activeTab === "tracker" ? (
        <div className="space-y-6">
          {(() => {
            const stats = {
              total: applications.length,
              active: applications.filter((a) => ["applied", "screening"].includes(a.status)).length,
              interview: applications.filter((a) => a.status === "interview").length,
              offer: applications.filter((a) => a.status === "offer").length,
              rejected: applications.filter((a) => a.status === "rejected").length,
            };
            const statusOrder: JobApplicationStatus[] = ["applied", "screening", "interview", "offer", "hired"];
            const statusLabel: Record<(typeof statusOrder)[number], string> = {
              applied: t("statusApplied"),
              screening: t("statusScreening"),
              interview: t("statusInterview"),
              offer: t("statusOffer"),
              hired: t("statusHired"),
              rejected: t("statusRejected"),
            };
            const currentStep = applications.reduce((max, app) => {
              const idx = statusOrder.indexOf(app.status);
              return idx > max && app.status !== "rejected" ? idx : max;
            }, -1);
            const grouped = {
              active: applications.filter((a) => ["applied", "screening"].includes(a.status)),
              progress: applications.filter((a) => ["interview", "offer"].includes(a.status)),
              closed: applications.filter((a) => ["rejected", "hired"].includes(a.status)),
            };
            const statusBadge = (status: JobApplicationStatus) => {
              if (status === "applied" || status === "screening") return "bg-blue-900/40 text-blue-200 border border-blue-500/40";
              if (status === "interview") return "bg-amber-900/40 text-amber-200 border border-amber-500/40";
              if (status === "offer") return "bg-green-900/40 text-green-200 border border-green-500/40";
              if (status === "hired") return "bg-green-900/30 text-green-200 border border-green-500/40";
              return "bg-red-900/40 text-red-200 border border-red-500/40";
            };

            return (
              <>
                <section className="space-y-4 rounded-3xl border border-border/60 bg-card/95 p-4 shadow-sm sm:p-5">
                  <div className="space-y-1">
                    <div className="text-xl font-bold sm:text-2xl" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>☰ {t("jobTracker")}</div>
                    <p className="text-sm text-muted-foreground">{t("trackerSubtitle")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {[
                      { label: t("trackerTotal"), value: stats.total, color: "text-blue-300" },
                      { label: t("trackerActive"), value: stats.active, color: "text-cyan-300" },
                      { label: t("trackerInterview"), value: stats.interview, color: "text-amber-300" },
                      { label: t("trackerOffer"), value: stats.offer, color: "text-green-300" },
                      { label: t("trackerRejected"), value: stats.rejected, color: "text-red-300" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border bg-background/70 p-4 text-center">
                        <div className={`text-3xl font-bold ${item.color}`} style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>{item.value}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("trackerPipeline")}</div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          currentStep >= 0
                            ? "border border-amber-500/40 bg-amber-500/15 text-amber-200"
                            : "border border-border bg-background/70 text-muted-foreground"
                        }`}
                      >
                        {currentStep >= 0 ? `${t("trackerCurrent")} ${statusLabel[statusOrder[currentStep]]}` : t("trackerNoPipeline")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {statusOrder.map((step, idx) => {
                        const state = idx < currentStep ? "done" : idx === currentStep ? "current" : "upcoming";
                        const countAtStep = applications.filter((a) => a.status === step).length;
                        const connectorColor = state === "done" ? "#22c55e" : state === "current" ? "#f59e0b" : "#2d3644";
                        const progress = state === "done" ? "100%" : state === "current" ? "58%" : "0%";
                        return (
                          <div
                            key={step}
                            className={`rounded-xl border px-3 py-3 text-center transition-all ${
                              state === "done"
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : state === "current"
                                  ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                                  : "border-border/70 bg-background/70"
                            }`}
                          >
                            <div className="relative mb-2 flex items-center justify-center">
                              {idx !== 0 && <div className="absolute -left-[calc(100%+8px)] top-1/2 hidden h-[2px] w-[52px] -translate-y-1/2 lg:block" style={{ background: idx <= currentStep ? "#22c55e" : "#2d3644" }} />}
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                                  state === "done"
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                                    : state === "current"
                                      ? "border-amber-300 bg-amber-500/20 text-amber-100"
                                      : "border-border bg-background text-muted-foreground"
                                }`}
                              >
                                {state === "done" ? <Check className="h-5 w-5" /> : state === "current" ? <Dot className="h-6 w-6" /> : <Circle className="h-4 w-4" />}
                              </div>
                            </div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">{statusLabel[step]}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{countAtStep} item{countAtStep === 1 ? "" : "s"}</div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: progress, background: connectorColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border/60 bg-card/95 shadow-sm">
                  <button
                    onClick={() => setShowTrackerForm((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">+</span>
                        {t("trackApplication")}
                    </span>
                      <span className="text-muted-foreground">{showTrackerForm ? t("hide") : t("show")}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showTrackerForm && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 border-t border-border px-4 pb-4 pt-3"
                        onSubmit={onCreateApplication}
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <input className="rounded-xl border border-border bg-background px-3 py-2.5" placeholder={t("jobTitle")} value={appForm.role_title} onChange={(e) => setAppForm((p) => ({ ...p, role_title: e.target.value }))} />
                          <input className="rounded-xl border border-border bg-background px-3 py-2.5" placeholder={t("company")} value={appForm.company} onChange={(e) => setAppForm((p) => ({ ...p, company: e.target.value }))} />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <select className="rounded-xl border border-border bg-background px-3 py-2.5" value={appForm.status} onChange={(e) => setAppForm((p) => ({ ...p, status: e.target.value as JobApplicationStatus }))}>
                            <option value="applied">{t("statusApplied")}</option>
                            <option value="screening">{t("statusScreening")}</option>
                            <option value="interview">{t("statusInterview")}</option>
                            <option value="offer">{t("statusOffer")}</option>
                            <option value="rejected">{t("statusRejected")}</option>
                            <option value="hired">{t("statusHired")}</option>
                          </select>
                          <input type="date" className="rounded-xl border border-border bg-background px-3 py-2.5" value={appForm.follow_up_date} onChange={(e) => setAppForm((p) => ({ ...p, follow_up_date: e.target.value }))} />
                        </div>
                        <textarea className="w-full rounded-xl border border-border bg-background px-3 py-2.5" rows={3} placeholder={t("notes")} value={appForm.notes} onChange={(e) => setAppForm((p) => ({ ...p, notes: e.target.value }))} />
                        <button className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground">{t("addApplication")}</button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </section>

                <p className="text-xs text-muted-foreground">📝 {t("trackerClickCardHint")}</p>

                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    { title: t("trackerActive"), color: "text-blue-300", dot: "bg-blue-400", items: grouped.active },
                    { title: t("trackerInProgress"), color: "text-amber-300", dot: "bg-amber-400", items: grouped.progress },
                    { title: t("trackerClosed"), color: "text-green-300", dot: "bg-green-400", items: grouped.closed },
                  ].map((col) => (
                    <div key={col.title} className="rounded-2xl border border-border bg-card/95 p-3.5 space-y-3 shadow-sm sm:p-4">
                      <div className="flex items-center justify-between text-sm font-semibold" style={{ fontFamily: "Space Grotesk, DM Sans, system-ui" }}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                          {col.title}
                        </div>
                        <span className="text-muted-foreground">{col.items.length}</span>
                      </div>
                      <div className="space-y-3">
                        {col.items.length === 0 ? (
                          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">{t("trackerNoItems")}</div>
                        ) : (
                          col.items.map((item) => {
                            const showReminder = item.follow_up_date && item.follow_up_date <= today && !["offer", "rejected", "hired"].includes(item.status);
                            return (
                              <details key={item.id} className="group rounded-xl border border-border bg-background/70 p-2.5 sm:p-3">
                                <summary className="flex cursor-pointer items-start justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-semibold sm:text-base">{item.role_title}</div>
                                    <div className="text-sm text-muted-foreground">{item.company}</div>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadge(item.status)}`}>
                                    {item.status}
                                  </span>
                                </summary>
                                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                  {item.follow_up_date && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span role="img" aria-label="calendar">📅</span>
                                      {item.follow_up_date}
                                      {showReminder ? <span className="text-amber-300">• {t("followUpDue")}</span> : null}
                                    </div>
                                  )}
                                  {item.notes ? <p className="text-sm text-muted-foreground">{item.notes}</p> : null}
                                  {item.ai_followup_draft ? <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">{item.ai_followup_draft}</pre> : null}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={item.status} onChange={(e) => void onStatusChange(item.id, e.target.value as JobApplicationStatus)}>
                                      <option value="applied">{t("statusApplied")}</option>
                                      <option value="screening">{t("statusScreening")}</option>
                                      <option value="interview">{t("statusInterview")}</option>
                                      <option value="offer">{t("statusOffer")}</option>
                                      <option value="rejected">{t("statusRejected")}</option>
                                      <option value="hired">{t("statusHired")}</option>
                                    </select>
                                    <button className="rounded-lg border border-border px-3 py-1.5 text-xs" onClick={() => void onGenerateDraft(item)}>{t("generateFollowUpDraft")}</button>
                                    <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400" onClick={() => void onDeleteApplication(item.id)}>{t("delete")}</button>
                                  </div>
                                </div>
                              </details>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ) : activeTab === "matching" ? (
        <JobMatchingPanel
          userId={userId!}
          approvedPosts={matchingJobs}
          onError={setError}
          prefilledDescription={matchingPrefillDescription}
          prefilledJobId={matchingPrefillJobId}
          onPrefillConsumed={() => {
            setMatchingPrefillDescription("");
            setMatchingPrefillJobId("");
          }}
        />
      ) : activeTab === "matches" ? (
        <JobMatchesDisplay 
          refreshTrigger={matchRefreshTrigger}
          onError={setError} 
        />
      ) : null}
    </section>
  );
}
