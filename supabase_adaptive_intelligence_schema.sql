-- Chakri AI Adaptive User Intelligence (separate from core profile system)
-- This layer tracks cross-device adaptive learning/job/interview signals.

create table if not exists adaptive_user_intelligence (
  user_id uuid primary key references auth.users(id) on delete cascade,

  quiz_attempts int not null default 0,
  quiz_accuracy_avg numeric(5,2) not null default 0,
  quiz_last_topic text,
  quiz_topic_stats jsonb not null default '{}'::jsonb,

  interview_sessions int not null default 0,
  interview_avg_confidence numeric(5,2) not null default 0,
  interview_avg_clarity numeric(5,2) not null default 0,
  interview_avg_relevance numeric(5,2) not null default 0,

  jobs_saved_count int not null default 0,
  jobs_applied_count int not null default 0,
  jobs_match_calls int not null default 0,

  recommendation_signals jsonb not null default '[]'::jsonb,
  recommendation_score numeric(5,2) not null default 0,

  last_quiz_at timestamp with time zone,
  last_interview_at timestamp with time zone,
  last_jobs_at timestamp with time zone,

  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists adaptive_user_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  signal_type text not null,
  metric_value numeric,
  payload jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table adaptive_user_signals
  drop constraint if exists adaptive_user_signals_domain_check;

alter table adaptive_user_signals
  add constraint adaptive_user_signals_domain_check check (
    domain in ('quiz', 'interview', 'jobs', 'recommendation')
  );

create index if not exists idx_adaptive_user_signals_user_created_at
  on adaptive_user_signals(user_id, created_at desc);

create index if not exists idx_adaptive_user_signals_domain
  on adaptive_user_signals(domain);

create index if not exists idx_adaptive_user_intelligence_updated_at
  on adaptive_user_intelligence(updated_at desc);

alter table adaptive_user_intelligence enable row level security;
alter table adaptive_user_signals enable row level security;

drop policy if exists "Users can read own adaptive intelligence" on adaptive_user_intelligence;
create policy "Users can read own adaptive intelligence"
  on adaptive_user_intelligence
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own adaptive intelligence" on adaptive_user_intelligence;
create policy "Users can insert own adaptive intelligence"
  on adaptive_user_intelligence
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own adaptive intelligence" on adaptive_user_intelligence;
create policy "Users can update own adaptive intelligence"
  on adaptive_user_intelligence
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own adaptive signals" on adaptive_user_signals;
create policy "Users can read own adaptive signals"
  on adaptive_user_signals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own adaptive signals" on adaptive_user_signals;
create policy "Users can insert own adaptive signals"
  on adaptive_user_signals
  for insert
  with check (auth.uid() = user_id);

-- Updates/deletes on raw signals are intentionally restricted.
