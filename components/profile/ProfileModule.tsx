"use client";

import { useEffect, useMemo, useState } from "react";
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
  updateDocument,
  updateEducation,
  updateExperience,
  updateProject,
  updateSkill,
  upsertProfile,
} from "@/lib/profileService";
import { DocumentMeta, Education, Experience, ProfileBundle, Project, Skill } from "@/types/profile";

type SectionCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

function SectionCard({ title, description, children, icon }: SectionCardProps) {
  return (
    <section className="group rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-7 shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm hover:border-primary/30">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {icon && <div className="text-primary/60 group-hover:text-primary transition-colors duration-300">{icon}</div>}
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export function ProfileModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [newEducation, setNewEducation] = useState({ institution: "", degree: "", field_of_study: "" });
  const [newSkill, setNewSkill] = useState({ name: "", level: "" });
  const [newProject, setNewProject] = useState({ title: "", description: "", url: "" });
  const [newExperience, setNewExperience] = useState({ company: "", title: "", description: "" });
  const [newDocument, setNewDocument] = useState({ name: "", url: "", type: "" });

  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentMeta | null>(null);

  const completion = useMemo(() => getProfileCompletion(bundle), [bundle]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function initialize() {
    const client = supabase;
    if (!client) {
      setLoading(false);
      setError(t("profileSupabaseMissing"));
      return;
    }

    setLoading(true);
    setError(null);

    const currentUserId = await getCurrentUserId(client);
    if (!currentUserId) {
      setError(t("profileAuthRequired"));
      setLoading(false);
      return;
    }

    setUserId(currentUserId);
    await reloadBundle(currentUserId);
    setLoading(false);
  }

  async function reloadBundle(currentUserId: string) {
    const client = supabase;
    if (!client) return;

    const data = await fetchProfileBundle(client, currentUserId);
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
    if (!supabase || !userId) return;
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
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await reloadBundle(userId);
    setSaving(false);
  }

  async function onAddEducation() {
    if (!supabase || !userId || !newEducation.institution.trim()) {
      setError(t("profileValidationEducation"));
      return;
    }

    const { error: insertError } = await createEducation(supabase, {
      user_id: userId,
      institution: newEducation.institution.trim(),
      degree: newEducation.degree.trim() || null,
      field_of_study: newEducation.field_of_study.trim() || null,
      start_year: null,
      end_year: null,
      grade: null,
      description: null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewEducation({ institution: "", degree: "", field_of_study: "" });
    await reloadBundle(userId);
  }

  async function onAddSkill() {
    if (!supabase || !userId || !newSkill.name.trim()) {
      setError(t("profileValidationSkill"));
      return;
    }

    const { error: insertError } = await createSkill(supabase, {
      user_id: userId,
      name: newSkill.name.trim(),
      level: newSkill.level.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewSkill({ name: "", level: "" });
    await reloadBundle(userId);
  }

  async function onAddProject() {
    if (!supabase || !userId || !newProject.title.trim()) {
      setError(t("profileValidationProject"));
      return;
    }

    const { error: insertError } = await createProject(supabase, {
      user_id: userId,
      title: newProject.title.trim(),
      description: newProject.description.trim() || null,
      url: newProject.url.trim() || null,
      start_date: null,
      end_date: null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewProject({ title: "", description: "", url: "" });
    await reloadBundle(userId);
  }

  async function onAddExperience() {
    if (!supabase || !userId || !newExperience.company.trim() || !newExperience.title.trim()) {
      setError(t("profileValidationExperience"));
      return;
    }

    const { error: insertError } = await createExperience(supabase, {
      user_id: userId,
      company: newExperience.company.trim(),
      title: newExperience.title.trim(),
      description: newExperience.description.trim() || null,
      start_date: null,
      end_date: null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewExperience({ company: "", title: "", description: "" });
    await reloadBundle(userId);
  }

  async function onAddDocument() {
    if (!supabase || !userId || !newDocument.name.trim() || !newDocument.url.trim()) {
      setError(t("profileValidationDocument"));
      return;
    }

    const { error: insertError } = await createDocument(supabase, {
      user_id: userId,
      name: newDocument.name.trim(),
      url: newDocument.url.trim(),
      type: newDocument.type.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewDocument({ name: "", url: "", type: "" });
    await reloadBundle(userId);
  }

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  if (error && !userId) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-card/50 p-8 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("profileBuilder")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("profileBuilderHint")}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-primary">{completion}% Complete</div>
            <div className="text-xs text-muted-foreground mt-1">Profile Progress</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-700 ease-out shadow-lg shadow-primary/30"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <SectionCard title={t("profileBasics")} description={t("profileBasicsHint")}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            placeholder={t("username")}
            value={profileForm.username}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <input
            className="rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            placeholder={t("fullName")}
            value={profileForm.full_name}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
          />
          <input
            className="rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            placeholder={t("avatarUrl")}
            value={profileForm.avatar_url}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            placeholder={t("profileSummary")}
            rows={4}
            value={profileForm.bio}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
          />
          <select
            className="rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            value={profileForm.theme}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, theme: e.target.value }))}
          >
            <option value="minimal">{t("portfolioThemeMinimal")}</option>
            <option value="classic">{t("portfolioThemeClassic")}</option>
            <option value="modern">{t("portfolioThemeModern")}</option>
          </select>
          <label className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 cursor-pointer hover:border-primary/50 transition-all duration-300">
            <input
              type="checkbox"
              checked={profileForm.is_public}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, is_public: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">{t("publicProfile")}</span>
          </label>
        </div>
        <button
          onClick={onSaveProfile}
          disabled={saving}
          className="group relative mt-2 w-full px-6 py-3 rounded-lg font-semibold text-sm overflow-hidden transition-all duration-300 disabled:opacity-60"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300" />
          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          {/* Content */}
          <span className="relative text-primary-foreground block group-hover:scale-105 transition-transform duration-300">
            {saving ? t("saving") : t("saveProfile")}
          </span>
        </button>
      </SectionCard>

      <SectionCard title={t("education")} description={t("educationHint")}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("institution")} value={newEducation.institution} onChange={(e) => setNewEducation((prev) => ({ ...prev, institution: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("degree")} value={newEducation.degree} onChange={(e) => setNewEducation((prev) => ({ ...prev, degree: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("fieldOfStudy")} value={newEducation.field_of_study} onChange={(e) => setNewEducation((prev) => ({ ...prev, field_of_study: e.target.value }))} />
        </div>
        <button onClick={onAddEducation} className="rounded-lg border border-border px-3 py-2">{t("addEducation")}</button>
        {bundle.educations.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyEducation")}</p> : bundle.educations.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            {editingEducation?.id === item.id ? (
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingEducation.institution} onChange={(e) => setEditingEducation({ ...editingEducation, institution: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingEducation.degree ?? ""} onChange={(e) => setEditingEducation({ ...editingEducation, degree: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingEducation.field_of_study ?? ""} onChange={(e) => setEditingEducation({ ...editingEducation, field_of_study: e.target.value })} />
                <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={async () => {
                  if (!supabase || !userId || !editingEducation) return;
                  await updateEducation(supabase, item.id, {
                    user_id: userId,
                    institution: editingEducation.institution,
                    degree: editingEducation.degree,
                    field_of_study: editingEducation.field_of_study,
                  });
                  setEditingEducation(null);
                  await reloadBundle(userId);
                }}>{t("save")}</button>
                <button className="rounded-lg border border-border px-3 py-2" onClick={() => setEditingEducation(null)}>{t("cancel")}</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.institution}</p>
                  <p className="text-sm text-muted-foreground">{item.degree ?? "-"} · {item.field_of_study ?? "-"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditingEducation(item)}>{t("edit")}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-400" onClick={async () => {
                    if (!supabase || !userId) return;
                    await deleteEducation(supabase, item.id);
                    await reloadBundle(userId);
                  }}>{t("delete")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title={t("skills")} description={t("skillsHint")}>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("skillName")} value={newSkill.name} onChange={(e) => setNewSkill((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("skillLevel")} value={newSkill.level} onChange={(e) => setNewSkill((prev) => ({ ...prev, level: e.target.value }))} />
        </div>
        <button onClick={onAddSkill} className="rounded-lg border border-border px-3 py-2">{t("addSkill")}</button>
        {bundle.skills.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptySkills")}</p> : bundle.skills.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            {editingSkill?.id === item.id ? (
              <div className="flex flex-wrap gap-2">
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingSkill.name} onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingSkill.level ?? ""} onChange={(e) => setEditingSkill({ ...editingSkill, level: e.target.value })} />
                <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={async () => {
                  if (!supabase || !userId || !editingSkill) return;
                  await updateSkill(supabase, item.id, { user_id: userId, name: editingSkill.name, level: editingSkill.level });
                  setEditingSkill(null);
                  await reloadBundle(userId);
                }}>{t("save")}</button>
                <button className="rounded-lg border border-border px-3 py-2" onClick={() => setEditingSkill(null)}>{t("cancel")}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p>{item.name} <span className="text-sm text-muted-foreground">({item.level ?? t("notSet")})</span></p>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditingSkill(item)}>{t("edit")}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-400" onClick={async () => {
                    if (!supabase || !userId) return;
                    await deleteSkill(supabase, item.id);
                    await reloadBundle(userId);
                  }}>{t("delete")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title={t("projects")} description={t("projectsHint")}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("projectTitle")} value={newProject.title} onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("projectUrl")} value={newProject.url} onChange={(e) => setNewProject((prev) => ({ ...prev, url: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("projectDescription")} value={newProject.description} onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <button onClick={onAddProject} className="rounded-lg border border-border px-3 py-2">{t("addProject")}</button>
        {bundle.projects.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyProjects")}</p> : bundle.projects.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            {editingProject?.id === item.id ? (
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingProject.url ?? ""} onChange={(e) => setEditingProject({ ...editingProject, url: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingProject.description ?? ""} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} />
                <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={async () => {
                  if (!supabase || !userId || !editingProject) return;
                  await updateProject(supabase, item.id, {
                    user_id: userId,
                    title: editingProject.title,
                    url: editingProject.url,
                    description: editingProject.description,
                  });
                  setEditingProject(null);
                  await reloadBundle(userId);
                }}>{t("save")}</button>
                <button className="rounded-lg border border-border px-3 py-2" onClick={() => setEditingProject(null)}>{t("cancel")}</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description ?? "-"}</p>
                  {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{item.url}</a> : null}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditingProject(item)}>{t("edit")}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-400" onClick={async () => {
                    if (!supabase || !userId) return;
                    await deleteProject(supabase, item.id);
                    await reloadBundle(userId);
                  }}>{t("delete")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title={t("experience")} description={t("experienceHint")}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("company")} value={newExperience.company} onChange={(e) => setNewExperience((prev) => ({ ...prev, company: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("jobTitle")} value={newExperience.title} onChange={(e) => setNewExperience((prev) => ({ ...prev, title: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("description")} value={newExperience.description} onChange={(e) => setNewExperience((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <button onClick={onAddExperience} className="rounded-lg border border-border px-3 py-2">{t("addExperience")}</button>
        {bundle.experiences.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyExperience")}</p> : bundle.experiences.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            {editingExperience?.id === item.id ? (
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingExperience.company} onChange={(e) => setEditingExperience({ ...editingExperience, company: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingExperience.title} onChange={(e) => setEditingExperience({ ...editingExperience, title: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingExperience.description ?? ""} onChange={(e) => setEditingExperience({ ...editingExperience, description: e.target.value })} />
                <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={async () => {
                  if (!supabase || !userId || !editingExperience) return;
                  await updateExperience(supabase, item.id, {
                    user_id: userId,
                    company: editingExperience.company,
                    title: editingExperience.title,
                    description: editingExperience.description,
                  });
                  setEditingExperience(null);
                  await reloadBundle(userId);
                }}>{t("save")}</button>
                <button className="rounded-lg border border-border px-3 py-2" onClick={() => setEditingExperience(null)}>{t("cancel")}</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.company}</p>
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditingExperience(item)}>{t("edit")}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-400" onClick={async () => {
                    if (!supabase || !userId) return;
                    await deleteExperience(supabase, item.id);
                    await reloadBundle(userId);
                  }}>{t("delete")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title={t("documents")} description={t("documentsHint")}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("documentName")} value={newDocument.name} onChange={(e) => setNewDocument((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("documentUrl")} value={newDocument.url} onChange={(e) => setNewDocument((prev) => ({ ...prev, url: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("documentType")}
            value={newDocument.type} onChange={(e) => setNewDocument((prev) => ({ ...prev, type: e.target.value }))} />
        </div>
        <button onClick={onAddDocument} className="rounded-lg border border-border px-3 py-2">{t("addDocument")}</button>
        {bundle.documents.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyDocuments")}</p> : bundle.documents.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            {editingDocument?.id === item.id ? (
              <div className="grid gap-2 md:grid-cols-3">
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingDocument.name} onChange={(e) => setEditingDocument({ ...editingDocument, name: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingDocument.url} onChange={(e) => setEditingDocument({ ...editingDocument, url: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2" value={editingDocument.type ?? ""} onChange={(e) => setEditingDocument({ ...editingDocument, type: e.target.value })} />
                <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" onClick={async () => {
                  if (!supabase || !userId || !editingDocument) return;
                  await updateDocument(supabase, item.id, {
                    user_id: userId,
                    name: editingDocument.name,
                    url: editingDocument.url,
                    type: editingDocument.type,
                  });
                  setEditingDocument(null);
                  await reloadBundle(userId);
                }}>{t("save")}</button>
                <button className="rounded-lg border border-border px-3 py-2" onClick={() => setEditingDocument(null)}>{t("cancel")}</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{item.url}</a>
                  <p className="text-sm text-muted-foreground">{item.type ?? t("notSet")}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditingDocument(item)}>{t("edit")}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1.5 text-red-400" onClick={async () => {
                    if (!supabase || !userId) return;
                    await deleteDocument(supabase, item.id);
                    await reloadBundle(userId);
                  }}>{t("delete")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
