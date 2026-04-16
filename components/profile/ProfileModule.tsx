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
import { ProfileBundle, Project } from "@/types/profile";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const ACCENT = "#22d3ee";

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
  const [newDocument, setNewDocument] = useState({ name: "", url: "" });

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

    const bootLine = "> Initializing dev.profile... Access granted. ✓";

    if (reduceMotion) {
      appendTerminal("system", bootLine);
      appendTerminal("system", "Type 'help' to inspect available commands.");
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
        appendTerminal("system", "Type 'help' to inspect available commands.");
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

    const { error: saveError } = await upsertProfile(supabase, userId, {
      username: normalizedUsername || null,
      full_name: profileForm.full_name.trim(),
      bio: profileForm.bio.trim() || null,
      avatar_url: profileForm.avatar_url.trim() || null,
      theme: profileForm.theme,
      is_public: profileForm.is_public,
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

    await reloadBundle(userId);
    setSaving(false);
    setSaveMessage("Profile saved successfully.");
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
    if (!supabase || !userId || !newDocument.name.trim() || !newDocument.url.trim()) return;
    if (!isValidHttpUrl(newDocument.url.trim())) {
      setError("Certificate URL must be a valid http(s) URL.");
      return;
    }

    await runMutation(async () => {
      const { error: createError } = await createDocument(supabase, {
        user_id: userId,
        name: newDocument.name.trim(),
        url: newDocument.url.trim(),
        type: null,
      });
      if (createError) throw createError;
      setNewDocument({ name: "", url: "" });
      await reloadBundle(userId);
    }, "Unable to add certificate.");
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
          <p>Available: help, skills, experience, contact, projects, easter_egg</p>
        </div>
      );
      return;
    }

    if (command === "skills") {
      appendTerminal(
        "output",
        bundle.skills.length === 0 ? (
          <p>No skills yet. Add one in edit mode.</p>
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
          <p>No experience timeline yet.</p>
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
          <p>No pinned projects yet.</p>
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

    appendTerminal("error", "bash: sudo hire-me: permission granted 🎉");
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
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  if (error && !userId) {
    return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">{error}</div>;
  }

  return (
    <div className="relative mx-auto max-w-[1180px] space-y-7 pb-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 left-8 h-72 w-72 rounded-full blur-3xl" style={{ background: "rgba(34,211,238,0.15)" }} />
        <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.15),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.08),transparent_42%)]" />
        {!reduceMotion && (
          <div className="absolute inset-0 hidden md:block">
            {heroCodeSnippets.map((snippet) => (
              <span
                key={snippet.text}
                className={cn("absolute rounded-full border border-cyan-300/25 bg-[#081323]/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200/75", snippet.pos, snippet.motion)}
                style={{ animationDelay: snippet.delay }}
              >
                {snippet.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <RevealPanel reduceMotion={reduceMotion} className="relative z-10">
        <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#070d16]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                Developer Profile
              </div>

              <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#0b1524]">
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

                <div className="min-w-[220px] flex-1">
                  <h1
                    className="text-4xl leading-none md:text-5xl"
                    style={{ fontFamily: '"Space Grotesk", "Sora", "Avenir Next", sans-serif', letterSpacing: "-0.02em" }}
                  >
                    {profileForm.full_name || "Unnamed Developer"}
                  </h1>
                  <p className="mt-2 text-sm text-cyan-200/90" style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}>
                    @{profileForm.username || "username"}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300" style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}>
                    {profileForm.bio || "Write a bold summary in edit mode to define your craft, speed, and edge."}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Completion", value: `${completion}%` },
                  { label: "Projects", value: `${bundle.projects.length}` },
                  { label: "Certificates", value: `${certificates.length}` },
                ].map((item) => (
                  <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                    <p
                      className="mt-1 text-2xl font-semibold"
                      style={{ color: ACCENT, fontFamily: '"Space Grotesk", "Sora", sans-serif' }}
                    >
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    setSaveMessage(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20"
                >
                  <Pencil size={16} />
                  {isEditing ? "Close Edit" : "Edit Profile"}
                </button>

                <button
                  type="button"
                  onClick={onPreviewProfile}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  <Eye size={16} />
                  Preview
                </button>

                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#03111a] transition-all disabled:opacity-60"
                  style={{ background: ACCENT }}
                >
                  <Save size={16} />
                  {saving ? t("saving") : "Save"}
                </button>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: ACCENT }} />
              </div>

              {saveMessage ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{saveMessage}</div> : null}
              {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#050a12] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-cyan-300/20 px-4 py-2">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
                  <TerminalSquare size={14} />
                  dev-terminal
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:100%_3px] opacity-20" />

              <div
                ref={terminalViewportRef}
                className="relative h-[320px] overflow-y-auto px-4 py-3 text-sm"
                style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace', color: "#8af3c5" }}
              >
                {terminalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "mb-2 leading-relaxed",
                      entry.kind === "command" && "text-cyan-200",
                      entry.kind === "error" && "text-amber-300"
                    )}
                  >
                    {entry.content}
                  </div>
                ))}

                {!terminalReady && terminalBootText ? (
                  <div className="text-cyan-200">
                    {terminalBootText}
                    <span className="ml-1 inline-block h-4 w-[7px] animate-pulse bg-cyan-200 align-middle" />
                  </div>
                ) : null}
              </div>

              <form onSubmit={onTerminalSubmit} className="relative border-t border-cyan-300/20 bg-[#050a12] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Command size={14} className="text-cyan-300" />
                  <input
                    value={terminalInput}
                    onChange={(event) => setTerminalInput(event.target.value)}
                    disabled={!terminalReady}
                    placeholder={terminalReady ? "Run command..." : "Booting shell..."}
                    className="w-full bg-transparent text-sm text-cyan-100 outline-none placeholder:text-slate-500 disabled:opacity-70"
                    style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace' }}
                  />
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">Press Enter to execute command</p>
              </form>
            </div>
          </div>
        </section>
      </RevealPanel>

      {isEditing ? (
        <RevealPanel reduceMotion={reduceMotion} delay={80} className="relative z-10">
          <section className="rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
                Edit Flow Console
              </h2>
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#03111a] disabled:opacity-70"
                style={{ background: ACCENT }}
              >
                {saving ? t("saving") : "Save Changes"}
              </button>
            </div>

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
                  className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm outline-none focus:border-cyan-300/40"
                />

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
                  Enable public profile
                </label>
              </div>

              <div className="space-y-3">
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add skill</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newSkill.name}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Skill"
                      className="w-full rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={onAddSkill} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200">
                      Add
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
                      Add
                    </button>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Add certificate</p>
                  <div className="mt-2 grid gap-2">
                    <input
                      value={newDocument.name}
                      onChange={(event) => setNewDocument((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Certificate title"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <input
                      value={newDocument.url}
                      onChange={(event) => setNewDocument((prev) => ({ ...prev, url: event.target.value }))}
                      placeholder="Verify URL"
                      className="rounded-lg border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={onAddDocument} className="rounded-lg bg-cyan-400/20 px-3 py-2 text-sm text-cyan-200">
                      Add Certificate
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </RevealPanel>
      ) : null}

      <RevealPanel reduceMotion={reduceMotion} delay={140} className="relative z-10">
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 p-5">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Experience Timeline
            </h3>
            <div className="mt-4 space-y-3">
              {bundle.experiences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">No experience entries yet.</div>
              ) : (
                bundle.experiences.map((item) => (
                  <div key={item.id} className="group relative rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-cyan-300/35 hover:bg-white/[0.05]">
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

          <article className="rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 p-5">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Skill Cloud
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {bundle.skills.length === 0 ? (
                <p className="text-sm text-slate-400">No skills added yet.</p>
              ) : (
                bundle.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200 transition-all hover:-translate-y-0.5"
                  >
                    {skill.name}
                    <button type="button" onClick={() => void onDeleteSkill(skill.id)} className="text-cyan-100/70 hover:text-red-300">
                      x
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact Nodes</p>
              <div className="mt-3 space-y-2 text-sm">
                {contactLinks.map((item) => (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="block underline decoration-cyan-400/60 underline-offset-4 hover:text-cyan-200">
                    {item.label}: {item.href}
                  </a>
                ))}
              </div>
            </div>
          </article>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={200} className="relative z-10">
        <section className="rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              GitHub Runway
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Live reel</span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {(bundle.projects.length > 0 ? bundle.projects : [{ id: "placeholder", title: "Add your first project", description: "Show your strongest build.", url: null, user_id: "", start_date: null, end_date: null }]).map((project, index) => {
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
                        <div className="h-full w-full rounded-2xl bg-[conic-gradient(from_0deg,rgba(34,211,238,0),rgba(34,211,238,0.95),rgba(20,184,166,0.9),rgba(34,211,238,0.95),rgba(34,211,238,0))] animate-[rgb-border-spin_4.5s_linear_infinite]" />
                      </div>
                      <div
                        className="relative h-full rounded-2xl border border-transparent bg-[#0b1524] p-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={reduceMotion ? undefined : { transform: tilt }}
                      >
                        <p className="text-lg font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
                          {project.title}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm text-slate-300">
                          {project.description || "No description yet. Add one in edit mode for stronger storytelling."}
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
                          className="mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#02131d] shadow-[0_0_25px_rgba(34,211,238,0.4)] transition hover:brightness-110"
                          style={{ background: ACCENT }}
                        >
                          <Github size={14} />
                          View on GitHub
                        </a>

                        <button
                          type="button"
                          onClick={() => void onDeleteProject(project.id)}
                          className="ml-2 mt-5 inline-flex items-center rounded-lg border border-red-300/35 px-3 py-2 text-sm text-red-200"
                        >
                          Remove
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
              placeholder="Add quick project title"
              className="w-full rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <button type="button" onClick={onAddProject} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200">
              Add
            </button>
          </div>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={260} className="relative z-10">
        <section className="rounded-3xl border border-cyan-300/20 bg-[#070d16]/95 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Certificate Motion Gallery
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Certified feed</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(certificates.length > 0
              ? certificates
              : [
                  {
                    id: "placeholder-cert",
                    user_id: "",
                    name: "Add your first certificate",
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
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1220] p-4 transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                  style={certificateAnimationStyle(index)}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_10%,rgba(255,255,255,0.2)_45%,transparent_85%)] translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[140%]" />
                  <div className="absolute right-3 top-3 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                    Certified ✓
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
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#02131d] shadow-[0_0_24px_rgba(34,211,238,0.4)]"
                        style={{ background: ACCENT }}
                      >
                        <BadgeCheck size={14} />
                        Verify
                      </a>
                      <button
                        type="button"
                        onClick={() => void onDeleteDocument(certificate.id)}
                        className="rounded-lg border border-red-300/35 px-3 py-2 text-sm text-red-200"
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
              placeholder="Certificate title"
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <input
              value={newDocument.url}
              onChange={(event) => setNewDocument((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="Verification URL"
              className="rounded-xl border border-white/15 bg-[#060b14] px-3 py-2 text-sm"
            />
            <button type="button" onClick={onAddDocument} className="rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200">
              Add Certificate
            </button>
          </div>
        </section>
      </RevealPanel>

      <RevealPanel reduceMotion={reduceMotion} delay={320} className="relative z-10">
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-cyan-300/20 bg-[#070d16]/95 p-4">
            <h4 className="text-xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Education
            </h4>
            <div className="mt-3 space-y-2">
              {bundle.educations.length === 0 ? (
                <p className="text-sm text-slate-400">No education entries yet.</p>
              ) : (
                bundle.educations.map((education) => (
                  <div key={education.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-semibold">{education.institution}</p>
                    <p className="text-sm text-slate-400">{education.degree || "Degree pending"}</p>
                    <button type="button" onClick={() => void onDeleteEducation(education.id)} className="mt-2 text-xs text-red-300">
                      Remove
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
                Add
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-cyan-300/20 bg-[#070d16]/95 p-4">
            <h4 className="text-xl font-semibold" style={{ fontFamily: '"Space Grotesk", "Sora", sans-serif' }}>
              Live Contact Deck
            </h4>
            <div className="mt-3 space-y-2 text-sm">
              {contactLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-all hover:border-cyan-300/35"
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
