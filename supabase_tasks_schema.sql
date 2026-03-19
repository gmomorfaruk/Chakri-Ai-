-- Chakri AI Phase 8: Quiz + Roadmap + Tasks
-- Run after profile/jobs/coach schemas

create table if not exists roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  target_role text,
  goal text,
  total_weeks int not null default 4,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists roadmap_weeks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  week_no int not null,
  focus_area text not null,
  deliverables text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  roadmap_id uuid references roadmaps(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium', -- low | medium | high
  status text not null default 'todo', -- todo | in_progress | done
  reminder_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add constraint tasks_priority_check check (priority in ('low', 'medium', 'high'));
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (status in ('todo', 'in_progress', 'done'));

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  topic text,
  questions jsonb not null,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answers jsonb not null,
  score int not null default 0,
  total int not null default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table roadmaps enable row level security;
alter table roadmap_weeks enable row level security;
alter table tasks enable row level security;
alter table quizzes enable row level security;
alter table quiz_attempts enable row level security;

drop policy if exists "Users can manage own roadmaps" on roadmaps;
create policy "Users can manage own roadmaps"
  on roadmaps
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own roadmap weeks" on roadmap_weeks;
create policy "Users can manage own roadmap weeks"
  on roadmap_weeks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own tasks" on tasks;
create policy "Users can manage own tasks"
  on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own quizzes" on quizzes;
create policy "Users can manage own quizzes"
  on quizzes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own quiz attempts" on quiz_attempts;
create policy "Users can manage own quiz attempts"
  on quiz_attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
