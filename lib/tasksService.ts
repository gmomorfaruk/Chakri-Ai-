import { SupabaseClient } from "@supabase/supabase-js";
import { Quiz, QuizAttempt, QuizQuestion, Roadmap, RoadmapWeek, TaskItem, TaskPriority, TaskStatus } from "@/types/tasks";

export async function createRoadmap(
  supabase: SupabaseClient,
  payload: Pick<Roadmap, "user_id" | "title" | "target_role" | "goal" | "total_weeks">
) {
  return supabase.from("roadmaps").insert(payload).select("*").single();
}

export async function createRoadmapWeeks(
  supabase: SupabaseClient,
  weeks: Array<Pick<RoadmapWeek, "roadmap_id" | "user_id" | "week_no" | "focus_area" | "deliverables">>
) {
  return supabase.from("roadmap_weeks").insert(weeks).select("*");
}

export async function getRoadmaps(supabase: SupabaseClient, userId: string) {
  return supabase.from("roadmaps").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<Roadmap[]>();
}

export async function getRoadmapWeeks(supabase: SupabaseClient, roadmapId: string) {
  return supabase.from("roadmap_weeks").select("*").eq("roadmap_id", roadmapId).order("week_no", { ascending: true }).returns<RoadmapWeek[]>();
}

export async function createTask(
  supabase: SupabaseClient,
  payload: Pick<TaskItem, "user_id" | "roadmap_id" | "title" | "description" | "due_date" | "priority" | "status" | "reminder_at">
) {
  return supabase.from("tasks").insert(payload).select("*").single();
}

export async function createTasksBulk(
  supabase: SupabaseClient,
  payload: Array<Pick<TaskItem, "user_id" | "roadmap_id" | "title" | "description" | "due_date" | "priority" | "status" | "reminder_at">>
) {
  return supabase.from("tasks").insert(payload).select("*");
}

export async function getTasks(supabase: SupabaseClient, userId: string) {
  return supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<TaskItem[]>();
}

export async function updateTaskStatus(supabase: SupabaseClient, taskId: string, status: TaskStatus) {
  return supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", taskId).select("*").single();
}

export async function updateTaskPriority(supabase: SupabaseClient, taskId: string, priority: TaskPriority) {
  return supabase.from("tasks").update({ priority, updated_at: new Date().toISOString() }).eq("id", taskId).select("*").single();
}

export async function deleteTask(supabase: SupabaseClient, taskId: string) {
  return supabase.from("tasks").delete().eq("id", taskId);
}

export async function createQuiz(
  supabase: SupabaseClient,
  payload: Pick<Quiz, "user_id" | "title" | "topic" | "questions">
) {
  return supabase.from("quizzes").insert(payload).select("*").single();
}

export async function getQuizzes(supabase: SupabaseClient, userId: string) {
  return supabase.from("quizzes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<Quiz[]>();
}

export async function createQuizAttempt(
  supabase: SupabaseClient,
  payload: Pick<QuizAttempt, "quiz_id" | "user_id" | "answers" | "score" | "total">
) {
  return supabase.from("quiz_attempts").insert(payload).select("*").single();
}

export async function getQuizAttempts(supabase: SupabaseClient, userId: string) {
  return supabase.from("quiz_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<QuizAttempt[]>();
}

export function generateRoadmapWeeks(goal: string, totalWeeks: number): Array<{ week_no: number; focus_area: string; deliverables: string }> {
  const focusTemplates = [
    "Core concepts and foundations",
    "Hands-on practice and mini-project",
    "Interview prep and mock questions",
    "Portfolio polish and measurable outcomes",
  ];

  return Array.from({ length: totalWeeks }).map((_, i) => {
    const week = i + 1;
    const focus = focusTemplates[i % focusTemplates.length];
    return {
      week_no: week,
      focus_area: `${focus}`,
      deliverables: `Week ${week}: Complete focused tasks for ${goal} and prepare one concrete output.`,
    };
  });
}

export function roadmapWeeksToTasks(
  userId: string,
  roadmapId: string,
  weeks: Array<{ week_no: number; focus_area: string; deliverables: string }>
) {
  const today = new Date();
  return weeks.map((w, idx) => {
    const due = new Date(today);
    due.setDate(today.getDate() + idx * 7 + 6);
    const reminder = new Date(due);
    reminder.setDate(due.getDate() - 1);

    return {
      user_id: userId,
      roadmap_id: roadmapId,
      title: `Week ${w.week_no}: ${w.focus_area}`,
      description: w.deliverables,
      due_date: due.toISOString().slice(0, 10),
      priority: "medium" as TaskPriority,
      status: "todo" as TaskStatus,
      reminder_at: reminder.toISOString(),
    };
  });
}

export function generateQuizQuestions(topic: string): QuizQuestion[] {
  const normalized = topic.trim().toLowerCase();

  const common: QuizQuestion[] = [
    {
      id: "q1",
      question: "Which approach improves interview answer quality the most?",
      options: ["Memorizing random facts", "Using STAR structure", "Speaking very fast", "Ignoring outcomes"],
      correctIndex: 1,
    },
    {
      id: "q2",
      question: "What makes a project description stronger for recruiters?",
      options: ["Only buzzwords", "Clear impact metrics", "Very long paragraphs", "No role clarity"],
      correctIndex: 1,
    },
  ];

  const technical: QuizQuestion[] = [
    {
      id: "q3",
      question: "In web apps, what does an API primarily do?",
      options: ["Styles UI", "Stores CSS", "Enables data communication", "Creates icons"],
      correctIndex: 2,
    },
    {
      id: "q4",
      question: "Why use version control like Git?",
      options: ["To avoid testing", "To track and manage code changes", "To remove code reviews", "To replace databases"],
      correctIndex: 1,
    },
  ];

  const communication: QuizQuestion[] = [
    {
      id: "q5",
      question: "What is best during behavioral interviews?",
      options: ["Blaming teammates", "Vague stories", "Specific situations and outcomes", "Avoiding challenges"],
      correctIndex: 2,
    },
    {
      id: "q6",
      question: "How should you handle a difficult question?",
      options: ["Panic", "Admit uncertainty and reason clearly", "Change topic", "Stay silent"],
      correctIndex: 1,
    },
  ];

  if (normalized.includes("technical") || normalized.includes("developer") || normalized.includes("software")) {
    return [...common, ...technical, ...communication];
  }

  return [...common, ...communication, ...technical];
}

export function scoreQuiz(questions: QuizQuestion[], answers: number[]) {
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) score += 1;
  });

  return { score, total: questions.length };
}
