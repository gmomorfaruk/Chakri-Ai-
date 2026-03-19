-- Chakri AI AI Career Coach Module (Phase 6)
-- Run after profile/jobs schemas

create table if not exists coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null default 'hr', -- hr | technical | behavioral
  title text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table coach_sessions drop constraint if exists coach_sessions_mode_check;
alter table coach_sessions add constraint coach_sessions_mode_check check (mode in ('hr', 'technical', 'behavioral'));

create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coach_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null, -- user | assistant | system
  content text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table coach_messages drop constraint if exists coach_messages_role_check;
alter table coach_messages add constraint coach_messages_role_check check (role in ('user', 'assistant', 'system'));

create table if not exists coach_evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coach_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answer_clarity_score int default 0,
  confidence_score int default 0,
  relevance_score int default 0,
  feedback text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table coach_evaluations drop constraint if exists coach_eval_clarity_range;
alter table coach_evaluations add constraint coach_eval_clarity_range check (answer_clarity_score between 0 and 100);
alter table coach_evaluations drop constraint if exists coach_eval_confidence_range;
alter table coach_evaluations add constraint coach_eval_confidence_range check (confidence_score between 0 and 100);
alter table coach_evaluations drop constraint if exists coach_eval_relevance_range;
alter table coach_evaluations add constraint coach_eval_relevance_range check (relevance_score between 0 and 100);

alter table coach_sessions enable row level security;
alter table coach_messages enable row level security;
alter table coach_evaluations enable row level security;

drop policy if exists "Users can manage own coach sessions" on coach_sessions;
create policy "Users can manage own coach sessions"
  on coach_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own coach messages" on coach_messages;
create policy "Users can manage own coach messages"
  on coach_messages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own coach evaluations" on coach_evaluations;
create policy "Users can manage own coach evaluations"
  on coach_evaluations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
