export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  target_role: string | null;
  goal: string | null;
  total_weeks: number;
  created_at: string;
}

export interface RoadmapWeek {
  id: string;
  roadmap_id: string;
  user_id: string;
  week_no: number;
  focus_area: string;
  deliverables: string | null;
  created_at: string;
}

export interface TaskItem {
  id: string;
  user_id: string;
  roadmap_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  topic: string | null;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: number[];
  score: number;
  total: number;
  created_at: string;
}
