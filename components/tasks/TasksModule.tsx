"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import {
  createRoadmap,
  createRoadmapWeeks,
  createTask,
  createTasksBulk,
  deleteTask,
  generateRoadmapWeeks,
  getRoadmapWeeks,
  getRoadmaps,
  getTasks,
  roadmapWeeksToTasks,
  updateTaskPriority,
  updateTaskStatus,
} from "@/lib/tasksService";
import { Roadmap, RoadmapWeek, TaskItem, TaskPriority, TaskStatus } from "@/types/tasks";

export function TasksModule() {
  const { t } = useI18n();
  const supabase = useSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"roadmap" | "tasks">("roadmap");

  const [userId, setUserId] = useState<string | null>(null);

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [roadmapWeeks, setRoadmapWeeks] = useState<RoadmapWeek[]>([]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [roadmapForm, setRoadmapForm] = useState({ title: "", target_role: "", goal: "", total_weeks: 4 });
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "medium" as TaskPriority });

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

    setUserId(auth.user.id);
    await reload(auth.user.id);
    setLoading(false);
  }

  async function reload(uid: string) {
    if (!supabase) return;

    const [roadmapsRes, tasksRes] = await Promise.all([
      getRoadmaps(supabase, uid),
      getTasks(supabase, uid),
    ]);

    const r = roadmapsRes.data ?? [];
    setRoadmaps(r);
    setTasks(tasksRes.data ?? []);

    const firstRoadmapId = selectedRoadmapId || r[0]?.id || null;
    setSelectedRoadmapId(firstRoadmapId);

    if (firstRoadmapId) {
      const weeksRes = await getRoadmapWeeks(supabase, firstRoadmapId);
      setRoadmapWeeks(weeksRes.data ?? []);
    } else {
      setRoadmapWeeks([]);
    }
  }

  async function onCreateRoadmap(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!roadmapForm.title.trim() || !roadmapForm.goal.trim()) {
      setError(t("roadmapValidation"));
      return;
    }

    const { data, error: createError } = await createRoadmap(supabase, {
      user_id: userId,
      title: roadmapForm.title.trim(),
      target_role: roadmapForm.target_role.trim() || null,
      goal: roadmapForm.goal.trim(),
      total_weeks: roadmapForm.total_weeks,
    });

    if (createError || !data) {
      setError(createError?.message ?? t("roadmapCreateFailed"));
      return;
    }

    const generatedWeeks = generateRoadmapWeeks(roadmapForm.goal, roadmapForm.total_weeks);

    const { error: weeksError } = await createRoadmapWeeks(
      supabase,
      generatedWeeks.map((w) => ({
        roadmap_id: data.id,
        user_id: userId,
        week_no: w.week_no,
        focus_area: w.focus_area,
        deliverables: w.deliverables,
      }))
    );

    if (weeksError) {
      setError(weeksError.message);
      return;
    }

    // Auto-create tasks from roadmap weeks
    const taskPayload = roadmapWeeksToTasks(userId, data.id, generatedWeeks);
    const { error: tasksError } = await createTasksBulk(supabase, taskPayload);
    if (tasksError) {
      setError(tasksError.message);
      return;
    }

    setRoadmapForm({ title: "", target_role: "", goal: "", total_weeks: 4 });
    setSelectedRoadmapId(data.id);
    await reload(userId);
  }

  async function onCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!taskForm.title.trim()) {
      setError(t("taskValidation"));
      return;
    }

    const reminderAt = taskForm.due_date ? `${taskForm.due_date}T09:00:00.000Z` : null;

    const { error: createError } = await createTask(supabase, {
      user_id: userId,
      roadmap_id: null,
      title: taskForm.title.trim(),
      description: null,
      due_date: taskForm.due_date || null,
      priority: taskForm.priority,
      status: "todo",
      reminder_at: reminderAt,
    });

    if (createError) {
      setError(createError.message);
      return;
    }

    setTaskForm({ title: "", due_date: "", priority: "medium" });
    await reload(userId);
  }

  const reminders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((task) => task.status !== "done" && task.due_date && task.due_date <= today);
  }, [tasks]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("tasks")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("tasksModuleHint")}</p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}

      {reminders.length > 0 ? (
        <div className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5 p-5 backdrop-blur-sm">
          <p className="text-sm font-semibold text-warning">{t("taskReminders")}</p>
          <ul className="mt-3 space-y-2 text-sm text-warning/80">
            {reminders.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                {task.title} ({task.due_date})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-2">
        {[
          { id: "roadmap", label: t("roadmapPlanner") },
          { id: "tasks", label: t("tasks") },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setTab(btn.id as typeof tab)}
            className={`relative px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 overflow-hidden group ${
              tab === btn.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
            )}
            {tab === btn.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            <span className="relative">{btn.label}</span>
          </button>
        ))}
      </div>

      {tab === "roadmap" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("roadmapCreate")}</h2>
            <form className="mt-3 grid gap-2" onSubmit={onCreateRoadmap}>
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("roadmapTitle")} value={roadmapForm.title} onChange={(e) => setRoadmapForm((p) => ({ ...p, title: e.target.value }))} />
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("roadmapTargetRole")} value={roadmapForm.target_role} onChange={(e) => setRoadmapForm((p) => ({ ...p, target_role: e.target.value }))} />
              <textarea className="rounded-lg border border-border bg-background px-3 py-2" rows={3} placeholder={t("roadmapGoal")} value={roadmapForm.goal} onChange={(e) => setRoadmapForm((p) => ({ ...p, goal: e.target.value }))} />
              <input type="number" min={2} max={16} className="rounded-lg border border-border bg-background px-3 py-2" value={roadmapForm.total_weeks} onChange={(e) => setRoadmapForm((p) => ({ ...p, total_weeks: Number(e.target.value) || 4 }))} />
              <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t("generateRoadmap")}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("roadmapWeeks")}</h2>
            <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2" value={selectedRoadmapId ?? ""} onChange={async (e) => {
              const id = e.target.value || null;
              setSelectedRoadmapId(id);
              if (!supabase || !id) {
                setRoadmapWeeks([]);
                return;
              }
              const weeksRes = await getRoadmapWeeks(supabase, id);
              setRoadmapWeeks(weeksRes.data ?? []);
            }}>
              <option value="">{t("selectRoadmap")}</option>
              {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <div className="mt-3 space-y-2">
              {roadmapWeeks.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyRoadmapWeeks")}</p> : roadmapWeeks.map((week) => (
                <article key={week.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{t("week")} {week.week_no}: {week.focus_area}</p>
                  <p className="text-sm text-muted-foreground">{week.deliverables}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : tab === "tasks" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("taskManager")}</h2>
            <form className="mt-3 grid gap-2" onSubmit={onCreateTask}>
              <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder={t("taskTitle")} value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />
              <input type="date" className="rounded-lg border border-border bg-background px-3 py-2" value={taskForm.due_date} onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))} />
              <select className="rounded-lg border border-border bg-background px-3 py-2" value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}>
                <option value="low">{t("priorityLow")}</option>
                <option value="medium">{t("priorityMedium")}</option>
                <option value="high">{t("priorityHigh")}</option>
              </select>
              <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t("addTask")}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("taskList")}</h2>
            <div className="mt-3 space-y-2">
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{t("emptyTasks")}</p> : tasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{task.title}</p>
                    <button className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-400" onClick={() => userId && supabase && deleteTask(supabase, task.id).then(() => reload(userId))}>{t("delete")}</button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{task.due_date ? `${t("dueDate")}: ${task.due_date}` : t("noDueDate")}</p>
                  <div className="mt-2 flex gap-2">
                    <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={task.status} onChange={(e) => userId && supabase && updateTaskStatus(supabase, task.id, e.target.value as TaskStatus).then(() => reload(userId))}>
                      <option value="todo">{t("statusTodo")}</option>
                      <option value="in_progress">{t("statusInProgress")}</option>
                      <option value="done">{t("statusDone")}</option>
                    </select>
                    <select className="rounded border border-border bg-background px-2 py-1 text-xs" value={task.priority} onChange={(e) => userId && supabase && updateTaskPriority(supabase, task.id, e.target.value as TaskPriority).then(() => reload(userId))}>
                      <option value="low">{t("priorityLow")}</option>
                      <option value="medium">{t("priorityMedium")}</option>
                      <option value="high">{t("priorityHigh")}</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
