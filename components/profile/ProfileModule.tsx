"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from "react";
import {
  BadgeCheck,
  Command,
  ExternalLink,
  Eye,
  GitFork,
  Github,
  Pencil,
  Save,
  Star,
  TerminalSquare,
} from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  createDocument,
  createEducation,
  createExperience,
  createProject,
  createSkill,
  deleteDocument,
  deleteEducation,
  deleteExperience,
  deleteProject,
  deleteSkill,
  fetchProfileBundle,
  getCurrentUserId,
  getProfileCompletion,
  upsertProfile,
} from "@/lib/profileService";
import { createApprovalRequest } from "@/lib/adminApprovalService";
import { ProfileBundle, Project } from "@/types/profile";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const ACCENT = "#22d3ee";
const PROFILE_UPLOAD_BUCKET = "profile-assets";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PANEL_SURFACE = "rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl";
const PANEL_SOFT = "rounded-2xl border border-white/10 bg-white/[0.03]";
const EMPTY_STATE = "rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-sm leading-6 text-slate-300";

type TerminalKind = "system" | "command" | "output" | "error";

type TerminalEntry = {
  id: string;
  kind: TerminalKind;
  content: ReactNode;
};

function createTerminalEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const heroCodeSnippets = [
  { text: "const build = 'ship-fast';", pos: "left-[6%] top-[10%]", motion: "flying-brand-text", delay: "0s" },
  { text: "if (focus) levelUp();", pos: "left-[12%] top-[62%]", motion: "flying-brand-text-rise", delay: "0.9s" },
  { text: "npm run confidence", pos: "right-[6%] top-[18%]", motion: "flying-brand-text-left", delay: "0.5s" },
  { text: "deploy --edge --clean", pos: "right-[10%] top-[70%]", motion: "flying-brand-text-swoop", delay: "1.2s" },
];

function hashFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pseudoCount(seed: string, min: number, spread: number) {
  return min + (hashFromString(seed) % spread);
}

function inferPrimaryLanguage(project: Project) {
  const source = `${project.title} ${project.description ?? ""} ${project.url ?? ""}`.toLowerCase();
  if (source.includes("next") || source.includes("react") || source.includes("tsx")) return "TypeScript";
  if (source.includes("node") || source.includes("express")) return "JavaScript";
  if (source.includes("python") || source.includes("django") || source.includes("flask")) return "Python";
  if (source.includes("go") || source.includes("golang")) return "Go";
  if (source.includes("java")) return "Java";
  if (source.includes("sql") || source.includes("postgres")) return "SQL";
  return "Code";
}

function sanitizeFileName(input: string) {
  const [name, extension] = input.split(/\.(?=[^.]+$)/);
  const safeName = (name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  const safeExt = (extension || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);

  return safeExt ? `${safeName || "file"}.${safeExt}` : safeName || "file";
}

function inferDocumentTypeFromFile(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.includes("word")) return "document";
  return "certificate";
}

function RevealPanel({
  children,
  className,
  delay = 0,
  reduceMotion = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  reduceMotion?: boolean;
}) {
  const [visible, setVisible] = useState(reduceMotion);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <section
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible || reduceMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
      style={reduceMotion ? undefined : ({ transitionDelay: `${delay}ms` } as CSSProperties)}
    >
      {children}
    </section>
  );
}

export function ProfileModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [bundle, setBundle] = useState<ProfileBundle>({
    profile: null,
    educations: [],
    skills: [],
    projects: [],
    experiences: [],
    documents: [],
  });

  const [profileForm, setProfileForm] = useState({
    username: "",
    full_name: "",
    bio: "",
    avatar_url: "",
    theme: "minimal",
    is_public: false,
  });

  const [newSkill, setNewSkill] = useState({ name: "", level: "" });
  const [newEducation, setNewEducation] = useState({ institution: "" });
  const [newExperience, setNewExperience] = useState({ company: "", title: "" });
  const [newProject, setNewProject] = useState({ title: "" });
  const [newDocument, setNewDocument] = useState({ name: "", url: "", type: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);

  const [terminalInput, setTerminalInput] = useState("");
  const [terminalBootText, setTerminalBootText] = useState("");
  const [terminalReady, setTerminalReady] = useState(false);
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const terminalViewportRef = useRef<HTMLDivElement | null>(null);

  const [projectRunwayReady, setProjectRunwayReady] = useState(false);
  const [projectTilt, setProjectTilt] = useState<Record<string, string>>({});
  const [certificateReady, setCertificateReady] = useState(false);

  const completion = useMemo(() => getProfileCompletion(bundle), [bundle]);

  const portfolioUrl = useMemo(() => {
    const username = bundle.profile?.username;
    if (!username) return null;
    if (typeof window === "undefined") return `/u/${username}`;
    return `${window.location.origin}/u/${username}`;
  }, [bundle.profile?.username]);

  const contactLinks = useMemo(() => {
    const firstGithub = bundle.projects.find((item) => item.url?.includes("github.com"))?.url ?? null;
    const safeUsername = profileForm.username.trim() || "developer";
    return [
      portfolioUrl ? { label: "Portfolio", href: portfolioUrl } : null,
      firstGithub ? { label: "GitHub", href: firstGithub } : { label: "GitHub", href: `https://github.com/${safeUsername}` },
      { label: "Email", href: `mailto:${safeUsername}@devmail.local` },
    ].filter((item): item is { label: string; href: string } => Boolean(item));
  }, [bundle.projects, portfolioUrl, profileForm.username]);

  const certificates = useMemo(() => bundle.documents, [bundle.documents]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = (error as { message?: string }).message;
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
    if (isMutating || saving) return;
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

  async function uploadProfileAssetFile(file: File, folder: "avatars" | "documents") {
    if (!supabase || !userId) {
      throw new Error("You must be signed in to upload files.");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("File is too large. Maximum allowed size is 10MB.");
    }

    const filePath = `${userId}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_UPLOAD_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      const missingBucket = /bucket not found/i.test(uploadError.message);
      throw new Error(
        missingBucket
          ? "Storage bucket 'profile-assets' is missing. Run supabase_profile_uploads_schema.sql in Supabase SQL Editor."
          : uploadError.message
      );
    }

    const { data: publicUrlData } = supabase.storage.from(PROFILE_UPLOAD_BUCKET).getPublicUrl(filePath);
    if (!publicUrlData?.publicUrl) {
      throw new Error("Upload completed but public URL could not be generated.");
    }

    return publicUrlData.publicUrl;
  }

  const appendTerminal = useCallback((kind: TerminalKind, content: ReactNode) => {
    setTerminalEntries((prev) => [...prev, { id: createTerminalEntryId(), kind, content }]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (reduceMotion) {
      setProjectRunwayReady(true);
      setCertificateReady(true);
      return;
    }

    setProjectRunwayReady(false);
    setCertificateReady(false);

    const projectTimer = window.setTimeout(() => setProjectRunwayReady(true), 80);
    const certTimer = window.setTimeout(() => setCertificateReady(true), 120);

    return () => {
      window.clearTimeout(projectTimer);
      window.clearTimeout(certTimer);
    };
  }, [reduceMotion]);

  useEffect(() => {
    setTerminalEntries([]);
    setTerminalReady(false);

    const bootLine = "> Initializing profile.console... ready.";

    if (reduceMotion) {
      appendTerminal("system", bootLine);
      appendTerminal("system", "Type help to view quick profile commands.");
      setTerminalReady(true);
      return;
    }

    setTerminalBootText("");
    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      setTerminalBootText(bootLine.slice(0, index));

      if (index >= bootLine.length) {
        window.clearInterval(timer);
        appendTerminal("system", bootLine);
        appendTerminal("system", "Type help to view quick profile commands.");
        setTerminalBootText("");
        setTerminalReady(true);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [appendTerminal, reduceMotion]);

  useEffect(() => {
    if (!terminalViewportRef.current) return;
    terminalViewportRef.current.scrollTop = terminalViewportRef.current.scrollHeight;
  }, [terminalBootText, terminalEntries]);

  async function initialize() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const currentUserId = await getCurrentUserId(supabase);
      if (!currentUserId) {
        setUserId(null);
        setError(t("profileAuthRequired"));
        return;
      }

      setUserId(currentUserId);
      await reloadBundle(currentUserId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load profile right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function reloadBundle(currentUserId: string) {
    if (!supabase) return;
    const data = await fetchProfileBundle(supabase, currentUserId);

    setBundle(data);
    setProfileForm({
      username: data.profile?.username ?? "",
      full_name: data.profile?.full_name ?? "",
      bio: data.profile?.bio ?? "",
      avatar_url: data.profile?.avatar_url ?? "",
      theme: data.profile?.theme ?? "minimal",
      is_public: data.profile?.is_public ?? false,
    });
  }

  async function onSaveProfile() {
    setSaveMessage(null);

    if (!supabase || !userId || saving || isMutating) return;

    if (!profileForm.full_name.trim()) {
      setError(t("profileValidationName"));
      return;
    }

    const normalizedUsername = profileForm.username.trim().toLowerCase();
    if (normalizedUsername && !/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
      setError(t("profileValidationUsername"));
      return;
    }

    if (profileForm.is_public && !normalizedUsername) {
      setError(t("profileValidationPublicUsername"));
      return;
    }

    if (profileForm.avatar_url.trim() && !isValidHttpUrl(profileForm.avatar_url.trim())) {
      setError("Avatar URL must be a valid http(s) URL.");
      return;
    }

    setSaving(true);
    setError(null);

    const requestedPublicVisibility = profileForm.is_public;

    const { error: saveError } = await upsertProfile(supabase, userId, {
      username: normalizedUsername || null,
      full_name: profileForm.full_name.trim(),
      bio: profileForm.bio.trim() || null,
      avatar_url: profileForm.avatar_url.trim() || null,
      theme: profileForm.theme,
      // Public visibility is gated by admin approval.
      is_public: requestedPublicVisibility ? false : profileForm.is_public,
    });

    if (saveError) {
      if (saveError.code === "23505") {
        setError("This username is already taken. Please choose another username.");
      } else {
        setError(saveError.message);
      }
      setSaving(false);
      return;
    }

    const updateSummary = `Profile update from ${profileForm.full_name.trim() || "Unnamed user"}${normalizedUsername ? ` (@${normalizedUsername})` : ""}`;

    const { error: profileApprovalError } = await createApprovalRequest(supabase, {
      requested_by: userId,
      request_type: "profile_update",
      resource_type: "profile",
      resource_id: userId,
      title: "Profile update requires admin review",
      summary: updateSummary,
      payload: {
        full_name: profileForm.full_name.trim(),
        username: normalizedUsername || null,
        theme: profileForm.theme,
        requested_public_visibility: requestedPublicVisibility,
      },
    });

    if (profileApprovalError) {
      const missingApprovalTable =
        profileApprovalError.message.includes("Could not find the table") &&
        profileApprovalError.message.includes("admin_approval_requests");

      setSaving(false);
      setError(
        missingApprovalTable
          ? "Profile saved, but approval workflow tables are missing. Run supabase_admin_approval_schema.sql in Supabase SQL Editor and retry."
          : `Profile saved, but admin approval request could not be created: ${profileApprovalError.message}`
      );
      return;
    }

    if (requestedPublicVisibility) {
      const { error: visibilityApprovalError } = await createApprovalRequest(supabase, {
        requested_by: userId,
        request_type: "portfolio_publish",
        resource_type: "profile",
        resource_id: userId,
        title: "Public profile visibility request",
        summary: `${profileForm.full_name.trim() || "User"} requested public portfolio approval`,
        payload: {
          desired_public_visibility: true,
          username: normalizedUsername || null,
        },
      });

      if (visibilityApprovalError) {
        const missingApprovalTable =
          visibilityApprovalError.message.includes("Could not find the table") &&
          visibilityApprovalError.message.includes("admin_approval_requests");

        setSaving(false);
        setError(
          missingApprovalTable
            ? "Profile saved, but approval workflow tables are missing. Run supabase_admin_approval_schema.sql in Supabase SQL Editor and retry."
            : `Profile saved, but portfolio visibility request could not be submitted: ${visibilityApprovalError.message}`
        );
        return;
      }
    }

    await reloadBundle(userId);
    setSaving(false);
    setSaveMessage(
      requestedPublicVisibility
        ? "Profile saved and submitted for admin approval. Public visibility will activate after approval."
        : "Profile saved and submitted for admin review."
    );
    setIsEditing(false);
  }

  async function onDeleteEducation(id: string) {
    if (!supabase || !userId) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this education entry?")) return;

    await runMutation(async () => {
      const { error: deleteError } = await deleteEducation(supabase, id);
      if (deleteError) throw deleteError;
      await reloadBundle(userId);
    }, "Unable to remove education entry.");
  }

  async function onDeleteSkill(id: string) {
    if (!supabase || !userId) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this skill?")) return;

    await runMutation(async () => {
      const { error: deleteError } = await deleteSkill(supabase, id);
      if (deleteError) throw deleteError;
      await reloadBundle(userId);
    }, "Unable to remove skill.");
  }

  async function onDeleteExperience(id: string) {
    if (!supabase || !userId) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this experience entry?")) return;

    await runMutation(async () => {
      const { error: deleteError } = await deleteExperience(supabase, id);
      if (deleteError) throw deleteError;
      await reloadBundle(userId);
    }, "Unable to remove experience entry.");
  }

  async function onDeleteProject(id: string) {
    if (!supabase || !userId || id === "placeholder") return;
    if (typeof window !== "undefined" && !window.confirm("Remove this project?")) return;

    await runMutation(async () => {
      const { error: deleteError } = await deleteProject(supabase, id);
      if (deleteError) throw deleteError;
      await reloadBundle(userId);
    }, "Unable to remove project.");
  }

  async function onDeleteDocument(id: string) {
    if (!supabase || !userId || id === "placeholder-cert") return;
    if (typeof window !== "undefined" && !window.confirm("Remove this certificate?")) return;

    await runMutation(async () => {
      const { error: deleteError } = await deleteDocument(supabase, id);
      if (deleteError) throw deleteError;
      await reloadBundle(userId);
    }, "Unable to remove certificate.");
  }

  async function onAddSkill() {
    if (!supabase || !userId || !newSkill.name.trim()) return;

    await runMutation(async () => {
      const { error: createError } = await createSkill(supabase, {
        user_id: userId,
        name: newSkill.name.trim(),
        level: newSkill.level || null,
      });
      if (createError) throw createError;
      setNewSkill({ name: "", level: "" });
      await reloadBundle(userId);
    }, "Unable to add skill.");
  }

  async function onAddEducation() {
    if (!supabase || !userId || !newEducation.institution.trim()) return;

    await runMutation(async () => {
      const { error: createError } = await createEducation(supabase, {
        user_id: userId,
        institution: newEducation.institution.trim(),
        degree: null,
        field_of_study: null,
        start_year: null,
        end_year: null,
        grade: null,
        description: null,
      });
      if (createError) throw createError;
      setNewEducation({ institution: "" });
      await reloadBundle(userId);
    }, "Unable to add education.");
  }

  async function onAddExperience() {
    if (!supabase || !userId || !newExperience.company.trim() || !newExperience.title.trim()) return;

    await runMutation(async () => {
      const { error: createError } = await createExperience(supabase, {
        user_id: userId,
        company: newExperience.company.trim(),
        title: newExperience.title.trim(),
        description: null,
        start_date: null,
        end_date: null,
      });
      if (createError) throw createError;
      setNewExperience({ company: "", title: "" });
      await reloadBundle(userId);
    }, "Unable to add experience.");
  }

  async function onAddProject() {
    if (!supabase || !userId || !newProject.title.trim()) return;

    await runMutation(async () => {
      const { error: createError } = await createProject(supabase, {
        user_id: userId,
        title: newProject.title.trim(),
        description: null,
        url: null,
        start_date: null,
        end_date: null,
      });
      if (createError) throw createError;
      setNewProject({ title: "" });
      await reloadBundle(userId);
    }, "Unable to add project.");
  }

  async function onAddDocument() {
    if (!supabase || !userId || !newDocument.name.trim()) return;
    const rawUrl = newDocument.url.trim();

    if (!documentFile && !rawUrl) {
      setError("Upload a document/image or provide a valid URL.");
      return;
    }

    if (rawUrl && !isValidHttpUrl(rawUrl)) {
      setError("Document URL must be a valid http(s) URL.");
      return;
    }

    setDocumentUploading(Boolean(documentFile));

    await runMutation(async () => {
      const uploadedUrl = documentFile ? await uploadProfileAssetFile(documentFile, "documents") : null;
      const finalUrl = uploadedUrl ?? rawUrl;

      const { error: createError } = await createDocument(supabase, {
        user_id: userId,
        name: newDocument.name.trim(),
        url: finalUrl,
        type: newDocument.type.trim() || (documentFile ? inferDocumentTypeFromFile(documentFile) : null),
      });
      if (createError) throw createError;
      setNewDocument({ name: "", url: "", type: "" });
      setDocumentFile(null);
      await reloadBundle(userId);
    }, "Unable to add certificate.");

    setDocumentUploading(false);
  }

  async function onUploadAvatarFile() {
    if (!avatarFile || !supabase || !userId) {
      setError("Select an image before uploading.");
      return;
    }

    setAvatarUploading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const uploadedUrl = await uploadProfileAssetFile(avatarFile, "avatars");
      setProfileForm((prev) => ({ ...prev, avatar_url: uploadedUrl }));
      setAvatarFile(null);
      setSaveMessage("Profile image uploaded. Click Save Profile to apply it.");
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Unable to upload profile image."));
    } finally {
      setAvatarUploading(false);
    }
  }

  function onPreviewProfile() {
    const previewUsername = profileForm.username.trim().toLowerCase() || bundle.profile?.username || "";
    if (!previewUsername || !/^[a-z0-9._]{3,30}$/.test(previewUsername)) {
      setError("Set a valid username first to preview your public profile.");
      return;
    }

    const previewUrl = typeof window === "undefined" ? `/u/${previewUsername}` : `${window.location.origin}/u/${previewUsername}`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  function runTerminalCommand(raw: string) {
    const command = raw.trim().toLowerCase();

    if (command === "help") {
      appendTerminal(
        "output",
        <div className="space-y-1">
          <p>Commands: help, skills, experience, contact, projects, easter_egg</p>
        </div>
      );
      return;
    }

    if (command === "skills") {
      appendTerminal(
        "output",
        bundle.skills.length === 0 ? (
          <p>No skills listed yet. Add your top capabilities in edit mode.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bundle.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border px-2 py-1 text-xs"
                style={{ borderColor: "rgba(34,211,238,0.5)", color: "#67e8f9" }}
              >
                {skill.name}
              </span>
            ))}
          </div>
        )
      );
      return;
    }

    if (command === "experience") {
      appendTerminal(
        "output",
        bundle.experiences.length === 0 ? (
          <p>No experience timeline yet. Add at least one role to improve profile depth.</p>
        ) : (
          <div className="space-y-1">
            {bundle.experiences.map((item, idx) => (
              <p key={item.id}>
                {idx + 1}. {item.title} @ {item.company}
              </p>
            ))}
          </div>
        )
      );
      return;
    }

    if (command === "contact") {
      appendTerminal(
        "output",
        <div className="space-y-1">
          {contactLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="block underline"
              style={{ color: "#67e8f9" }}
            >
              {item.label}: {item.href}
            </a>
          ))}
        </div>
      );
      return;
    }

    if (command === "projects") {
      appendTerminal(
        "output",
        bundle.projects.length === 0 ? (
          <p>No projects pinned yet. Add one strong project to showcase outcomes.</p>
        ) : (
          <div className="space-y-1">
            {bundle.projects.slice(0, 6).map((item) => (
              <p key={item.id}>
                - {item.title}: {item.description?.slice(0, 90) || "No short description yet."}
              </p>
            ))}
          </div>
        )
      );
      return;
    }

    if (command === "easter_egg") {
      appendTerminal(
        "output",
        <pre className="whitespace-pre-wrap text-xs leading-relaxed">
{`  /\\_/\\
 ( o.o )
  > ^ <

System joke: recruiter.exe found your profile and crashed from too much talent.`}
        </pre>
      );
      return;
    }

    appendTerminal("error", "Command not recognized. Run help to see available options.");
  }

  function onTerminalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = terminalInput.trim();
    if (!value || !terminalReady) return;

    appendTerminal("command", `> ${value}`);
    setTerminalInput("");
    runTerminalCommand(value);
  }

  function onProjectMouseMove(projectId: string, event: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 12;
    const rotateX = (0.5 - y) * 10;

    setProjectTilt((prev) => ({
      ...prev,
      [projectId]: `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`,
    }));
  }

  function onProjectMouseLeave(projectId: string) {
    setProjectTilt((prev) => ({
      ...prev,
      [projectId]: "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)",
    }));
  }

  function certificateAnimationStyle(index: number) {
    if (reduceMotion) return {} as CSSProperties;

    const delay = 120 * index;
    const hiddenStyles: CSSProperties[] = [
      { transform: "perspective(900px) rotateY(-92deg) scale(0.92)", opacity: 0 },
      { transform: "scale(0.64)", opacity: 0 },
      { transform: "translateY(-64px) rotate(-4deg) scale(0.88)", opacity: 0 },
    ];

    return {
      ...(certificateReady ? { transform: "none", opacity: 1 } : hiddenStyles[index % hiddenStyles.length]),
      transition: `transform 760ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, opacity 760ms ease ${delay}ms`,
    } satisfies CSSProperties;
  }

  if (loading) {
    return (
      <div className="ui-skeleton rounded-2xl p-6">
        <div className="space-y-3">
          <div className="ui-skeleton-line h-7 w-1/3" />
          <div className="ui-skeleton-line w-2/3" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="ui-skeleton h-24" />
          <div className="ui-skeleton h-24" />
          <div className="ui-skeleton h-24" />
        </div>
        <p className="mt-4 text-sm text-slate-400">{t("loading") || "Loading profile workspace..."}</p>
      </div>
    );
  }

  if (error && !userId) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error}</div>;
  }

  return (
    <div className="relative mx-auto max-w-[1180px] space-y-6 pb-8 text-slate-100 lg:space-y-7">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 left-8 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(34,211,238,0.11)" }} />
        <div className="absolute right-[-120px] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:24px_24px] opacity-12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.06),transparent_42%)]" />
        {!reduceMotion && (
          <div className="absolute inset-0 hidden xl:block">
            {heroCodeSnippets.map((snippet) => (
              <span
                key={snippet.text}
                className={cn("absolute rounded-full border border-cyan-300/20 bg-[#081323]/55 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100/65", snippet.pos, snippet.motion)}
                style={{ animationDelay: snippet.delay }}
              >
                {snippet.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <RevealPanel reduceMotion={reduceMotion} className="relative z-10">
        <section className={cn(PANEL_SURFACE, "overflow-hidden")}>
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
            <div className="space-y-4 lg:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                Developer Profile
              </div>

              <div className="flex flex-wrap items-start gap-4 lg:gap-5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#0b1524] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                  {profileForm.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Avatar URLs are user-provided and may not be in a fixed Next image allowlist.
                    <img src={profileForm.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-2xl font-black"
                      style={{ color: ACCENT, fontFamily: '"Space Grotesk", "Sora", sans-serif' }}
                    >
                      {(profileForm.full_name || "Dev").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Profile visibility for hiring teams</p>
                  <h1
                    className="mt-2 text-3xl leading-tight md:text-4xl"
                    style={{ fontFamily: '"Space Grotesk", "Sora", "Avenir Next", sans-serif', letterSpacing: "-0.02em" }}
                  >
                    {profileForm.full_name || "Unnamed Developer"}
                  </h1>
                  <p className="mt-1 text-sm text-cyan-200/90" style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}>
                    @{profileForm.username || "username"}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300" style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}>
                    {profileForm.bio || "Add a concise professional summary that highlights your role focus, strongest outcomes, and career direction."}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Profile Strength", value: `${completion}%`, hint: "Readiness score" },
                  { label: "Projects", value: `${bundle.projects.length}`, hint: "Proof of work" },
                  { label: "Certificates", value: `${certificates.length}`, hint: "Verified learning" },
                ].map((item) => (
                  <article key={item.label} className={cn(PANEL_SOFT, "p-3.5")}> 
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <p
                      className="mt-1 text-2xl font-semibold"
                      style={{ color: ACCENT, fontFamily: '"Space Grotesk", "Sora", sans-serif' }}
                    >
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    setSaveMessage(null);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20"
                >
                  <Pencil size={16} />
                  {isEditing ? "Close Editor" : "Edit Profile"}
                </button>

                <button
                  type="button"
                  onClick={onPreviewProfile}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  <Eye size={16} />
                  Preview Public Page
                </button>

                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#03111a] shadow-[0_8px_24px_rgba(34,211,238,0.35)] transition-all hover:brightness-105 disabled:opacity-60"
                  style={{ background: ACCENT }}
                >
                  <Save size={16} />
                  {saving ? t("saving") : "Save Profile"}
                </button>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Profile completion</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: ACCENT }} />
                </div>
              </div>

              {saveMessage ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{saveMessage}</div> : null}
              {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#060d18]/95 shadow-[0_16px_36px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between border-b border-cyan-300/15 px-4 py-2.5">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  <TerminalSquare size={14} />
                  Profile Console
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:100%_3px] opacity-15" />

              <div
                ref={terminalViewportRef}
                className="relative h-[292px] overflow-y-auto px-4 py-3 text-[13px]"
                style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', color: "#88d5c3" }}
              >
                {terminalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "mb-2 leading-relaxed",
                      entry.kind === "command" && "text-cyan-100",
                      entry.kind === "error" && "text-amber-300"
                    )}
                  >
                    {entry.content}
                  </div>
                ))}

                {!terminalReady && terminalBootText ? (
                  <div className="text-cyan-100">
                    {terminalBootText}
                    <span className="ml-1 inline-block h-4 w-[7px] animate-pulse bg-cyan-100 align-middle" />
                  </div>
                ) : null}
              </div>

              <form onSubmit={onTerminalSubmit} className="relative border-t border-cyan-300/15 bg-[#050a12]/90 px-4 py-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <Command size={14} className="text-cyan-200/85" />
                  <input
                    value={terminalInput}
                    onChange={(event) => setTerminalInput(event.target.value)}
                    disabled={!terminalReady}
                    placeholder={terminalReady ? "Try: help" : "Starting console..."}
                    className="w-full bg-transparent text-sm text-cyan-100 outline-none placeholder:text-slate-500 disabled:opacity-70"
                    style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}
                  />
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Enter to run command</p>
              </form>
            </div>
          </div>
        </section>
      </RevealPanel>

      {isEditing ? (
        <RevealPanel reduceMotion={reduceMotion} delay={80} className="relative z-10">
          <section className={cn(PANEL_SURFACE, "p-6")}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
                Profile Editing Console
              </h2>
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#03111a] disabled:opacity-70"
                style={{ background: ACCENT }}
              >
                {saving ? t("saving") : "Save Profile"}
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-400">Update your profile content and keep your public presentation current.</p>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Full name</label>
                <input
                  value={profileForm.full_name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm outline-none focus:border-cyan-300/40"
                />

                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Username</label>
                <input
                  value={profileForm.username}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm outline-none focus:border-cyan-300/40"
                />

                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Avatar URL</label>
                <input
                  value={profileForm.avatar_url}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm outline-none focus:border-cyan-300/40"
                />

                <div className="rounded-xl border border-white/10 bg-[#060b14]/70 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upload profile image</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-2 file:py-1 file:text-xs file:text-cyan-100"
                    />
                    <button
                      type="button"
                      onClick={() => void onUploadAvatarFile()}
                      disabled={!avatarFile || avatarUploading}
                      className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200 disabled:opacity-60"
                    >
                      {avatarUploading ? "Uploading..." : "Upload Image"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">PNG/JPG/WebP up to 10MB.</p>
                </div>

                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Bio</label>
                <textarea
                  rows={4}
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm outline-none focus:border-cyan-300/40"
                />

                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={profileForm.is_public}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, is_public: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-[#060b14]"
                  />
                  Make my portfolio publicly visible
                </label>
              </div>

              <div className="space-y-3">
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add skill</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newSkill.name}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Skill name"
                      className="w-full rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={onAddSkill} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200">
                      Add Skill
                    </button>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add experience</p>
                  <div className="mt-2 grid gap-2">
                    <input
                      value={newExperience.title}
                      onChange={(event) => setNewExperience((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Role"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <input
                      value={newExperience.company}
                      onChange={(event) => setNewExperience((prev) => ({ ...prev, company: event.target.value }))}
                      placeholder="Company"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={onAddExperience} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200">
                      Add Experience
                    </button>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add project</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newProject.title}
                      onChange={(event) => setNewProject((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Project title"
                      className="w-full rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={onAddProject} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200">
                      Add Project
                    </button>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add certificate</p>
                  <div className="mt-2 grid gap-2">
                    <input
                      value={newDocument.name}
                      onChange={(event) => setNewDocument((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Document title"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <input
                      value={newDocument.url}
                      onChange={(event) => setNewDocument((prev) => ({ ...prev, url: event.target.value }))}
                      placeholder="Document URL (optional if file uploaded)"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <input
                      value={newDocument.type}
                      onChange={(event) => setNewDocument((prev) => ({ ...prev, type: event.target.value }))}
                      placeholder="Type (certificate, image, transcript, etc)"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
                      onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-2 file:py-1 file:text-xs file:text-cyan-100"
                    />
                    <button type="button" onClick={onAddDocument} disabled={documentUploading} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200 disabled:opacity-60">
                      {documentUploading ? "Uploading..." : "Add Document"}
                    </button>
                    <p className="text-xs text-slate-500">Upload certificate/document image OR provide URL.</p>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </RevealPanel>
      ) : null}

      <RevealPanel reduceMotion={reduceMotion} delay={140} className="relative z-10">
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className={cn(PANEL_SURFACE, "p-5")}>
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Experience Timeline
            </h3>
            <p className="mt-1 text-sm text-slate-400">Recent roles, impact, and career progression.</p>
            <div className="mt-4 space-y-3">
              {bundle.experiences.length === 0 ? (
                <div className={EMPTY_STATE}>No experience added yet. Add your latest role in edit mode so recruiters can quickly understand your progression.</div>
              ) : (
                bundle.experiences.map((item) => (
                  <div key={item.id} className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-cyan-300/30 hover:bg-white/[0.05]">
                    <div className="absolute left-3 top-4 h-[calc(100%-1.25rem)] w-[2px] bg-gradient-to-b from-cyan-300/80 to-transparent" />
                    <div className="pl-5">
                      <p className="text-sm uppercase tracking-[0.16em] text-slate-400">{item.start_date || "Start"} - {item.end_date || "Current"}</p>
                      <p className="mt-1 text-lg font-semibold">{item.title}</p>
                      <p className="text-sm text-cyan-200">{item.company}</p>
                      <button
                        type="button"
                        onClick={() => void onDeleteExperience(item.id)}
                        className="mt-2 text-xs text-red-300 opacity-0 transition group-hover:opacity-100"
                      >
                        Remove entry
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={cn(PANEL_SURFACE, "p-5")}>
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Skill Cloud
            </h3>
            <p className="mt-1 text-sm text-slate-400">Core strengths and tools you can apply immediately.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {bundle.skills.length === 0 ? (
                <p className={EMPTY_STATE}>No skills added yet. Add 5-8 targeted skills to improve matching and profile credibility.</p>
              ) : (
                bundle.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-200 transition-all hover:-translate-y-0.5"
                  >
                    {skill.name}
                    <button type="button" onClick={() => void onDeleteSkill(skill.id)} className="text-cyan-100/70 hover:text-red-300">
                      x
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className={cn(PANEL_SOFT, "mt-6 p-4")}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact Channels</p>
              <div className="mt-3 space-y-2 text-sm">
                {contactLinks.map((item) => (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/10 px-3 py-2 underline decoration-cyan-400/60 underline-offset-4 hover:border-cyan-300/35 hover:text-cyan-200">
                    {item.label}: {item.href}
                  </a>
                ))}
              </div>
            </div>
          </article>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={200} className="relative z-10">
        <section className={cn(PANEL_SURFACE, "p-5")}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              GitHub Runway
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Project proof</span>
          </div>
          <p className="mb-4 text-sm text-slate-400">Showcase meaningful builds with concise outcome-focused descriptions.</p>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {(bundle.projects.length > 0
                ? bundle.projects
                : [{ id: "placeholder", title: "Add your first flagship project", description: "Include one project with clear impact, metrics, and your specific contribution.", url: null, user_id: "", start_date: null, end_date: null }]).map((project, index) => {
                const stars = pseudoCount(project.title, 18, 210);
                const forks = pseudoCount(project.title + "forks", 5, 90);
                const language = inferPrimaryLanguage(project as Project);
                const tilt = projectTilt[project.id] ?? "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)";
                const entryStyle: CSSProperties = reduceMotion
                  ? {}
                  : {
                      opacity: projectRunwayReady ? 1 : 0,
                      transform: projectRunwayReady ? "translateX(0px)" : "translateX(-68px)",
                      transition: `opacity 760ms cubic-bezier(0.22,1,0.36,1) ${index * 120}ms, transform 760ms cubic-bezier(0.22,1,0.36,1) ${index * 120}ms`,
                    };

                return (
                  <div key={project.id} style={entryStyle}>
                    <article
                      onMouseMove={(event) => onProjectMouseMove(project.id, event)}
                      onMouseLeave={() => onProjectMouseLeave(project.id)}
                      className="group relative w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1220] p-[1px]"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        <div className="h-full w-full rounded-2xl bg-[linear-gradient(135deg,rgba(34,211,238,0.28),rgba(20,184,166,0.2),rgba(34,211,238,0))]" />
                      </div>
                      <div
                        className="relative h-full rounded-2xl border border-transparent bg-[#0b1524] p-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={reduceMotion ? undefined : { transform: tilt }}
                      >
                        <p className="text-lg font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
                          {project.title}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm text-slate-300">
                          {project.description || "Add a short impact summary in edit mode so reviewers can quickly evaluate your contribution."}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-cyan-200">{language}</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-slate-300">
                            <Star size={12} /> {stars}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-slate-300">
                            <GitFork size={12} /> {forks}
                          </span>
                        </div>

                        <a
                          href={project.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#02131d] shadow-[0_0_18px_rgba(34,211,238,0.35)] transition hover:brightness-110"
                          style={{ background: ACCENT }}
                        >
                          <Github size={14} />
                          Open Repository
                        </a>

                        <button
                          type="button"
                          onClick={() => void onDeleteProject(project.id)}
                          className="ml-2 mt-5 inline-flex h-9 items-center rounded-lg border border-red-300/35 px-3 text-sm text-red-200"
                        >
                          Remove Project
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={newProject.title}
              onChange={(event) => setNewProject((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Add project title"
              className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <button type="button" onClick={onAddProject} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200">
              Add Project
            </button>
          </div>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={260} className="relative z-10">
        <section className={cn(PANEL_SURFACE, "p-5")}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Certificate Motion Gallery
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Credentials</span>
          </div>
          <p className="mb-4 text-sm text-slate-400">Verification links make your learning and specialization easy to trust.</p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(certificates.length > 0
              ? certificates
              : [
                  {
                    id: "placeholder-cert",
                    user_id: "",
                    name: "Add your first verified credential",
                    url: "",
                    type: "Issuer",
                  },
                ]
            ).map((certificate, index) => {
              const uploadedAt = (certificate as { uploaded_at?: string }).uploaded_at;
              const issuedDate = uploadedAt ? new Date(uploadedAt).toLocaleDateString() : "Date pending";

              return (
                <article
                  key={certificate.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1220] p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.45)]"
                  style={certificateAnimationStyle(index)}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0)_58%)]" />
                  <div className="absolute right-3 top-3 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                    Verified
                  </div>

                  <div className="relative z-10">
                    <p className="text-lg font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
                      {certificate.name}
                    </p>
                    <p className="mt-1 text-sm text-cyan-200">{certificate.type || "Verified issuer"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Issued: {issuedDate}</p>

                    <div className="mt-4 flex items-center gap-2">
                      <a
                        href={certificate.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#02131d] shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                        style={{ background: ACCENT }}
                      >
                        <BadgeCheck size={14} />
                        Verify Credential
                      </a>
                      <button
                        type="button"
                        onClick={() => void onDeleteDocument(certificate.id)}
                        className="h-9 rounded-lg border border-red-300/35 px-3 text-sm text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={newDocument.name}
              onChange={(event) => setNewDocument((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Document title"
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <input
              value={newDocument.url}
              onChange={(event) => setNewDocument((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="Document URL (optional if file uploaded)"
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <button type="button" onClick={onAddDocument} disabled={documentUploading} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-60">
              {documentUploading ? "Uploading..." : "Add Document"}
            </button>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input
              value={newDocument.type}
              onChange={(event) => setNewDocument((prev) => ({ ...prev, type: event.target.value }))}
              placeholder="Type (certificate, image, transcript, etc)"
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
              onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-2 file:py-1 file:text-xs file:text-cyan-100"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Upload certificate/document image OR provide URL.</p>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={320} className="relative z-10">
        <section className="grid gap-4 lg:grid-cols-2">
          <article className={cn(PANEL_SURFACE, "rounded-2xl p-4") }>
            <h4 className="text-xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Education
            </h4>
            <p className="mt-1 text-sm text-slate-400">Academic background and formal training.</p>
            <div className="mt-3 space-y-2">
              {bundle.educations.length === 0 ? (
                <p className={EMPTY_STATE}>No education details yet. Add your institution to give recruiters essential background context.</p>
              ) : (
                bundle.educations.map((education) => (
                  <div key={education.id} className={cn(PANEL_SOFT, "p-3") }>
                    <p className="font-semibold">{education.institution}</p>
                    <p className="text-sm text-slate-400">{education.degree || "Degree pending"}</p>
                    <button type="button" onClick={() => void onDeleteEducation(education.id)} className="mt-2 text-xs text-red-300">
                      Remove Entry
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newEducation.institution}
                onChange={(event) => setNewEducation({ institution: event.target.value })}
                placeholder="Add institution"
                className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
              />
              <button type="button" onClick={onAddEducation} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200">
                Add Education
              </button>
            </div>
          </article>

          <article className={cn(PANEL_SURFACE, "rounded-2xl p-4") }>
            <h4 className="text-xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Professional Contact Links
            </h4>
            <p className="mt-1 text-sm text-slate-400">Direct ways to review your work or reach out.</p>
            <div className="mt-3 space-y-2 text-sm">
              {contactLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-cyan-300/35"
                >
                  <span>{item.label}</span>
                  <ExternalLink size={14} className="text-cyan-300" />
                </a>
              ))}
            </div>
          </article>
        </section>
      </RevealPanel>
    </div>
  );
}
