-- Chakri AI Job Matches Table
-- Stores calculated job matching results for users

create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  
  -- Individual scoring factors (0.0 to 1.0)
  skill_score float not null default 0,
  role_score float not null default 0,
  location_score float not null default 0,
  experience_score float not null default 0,
  
  -- Weighted total score (0.0 to 1.0)
  total_score float not null default 0,
  
  -- Skill matching details
  matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  
  -- Metadata for debugging
  computed_at timestamp with time zone default timezone('utc', now()),
  created_at timestamp with time zone default timezone('utc', now()),
  
  -- Unique constraint: one match per user per job
  constraint unique_user_job_match unique(user_id, job_id)
);

-- Indexes for fast queries
create index if not exists idx_job_matches_user_id on job_matches(user_id);
create index if not exists idx_job_matches_job_id on job_matches(job_id);
create index if not exists idx_job_matches_total_score on job_matches(total_score desc);
create index if not exists idx_job_matches_created_at on job_matches(created_at desc);
create index if not exists idx_job_matches_user_score on job_matches(user_id, total_score desc);

-- Enable Row Level Security
alter table job_matches enable row level security;

-- RLS Policy 1: Users can view their own matches
drop policy if exists "Users can view their own job matches" on job_matches;
create policy "Users can view their own job matches"
  on job_matches
  for select
  using (auth.uid() = user_id);

-- RLS Policy 2: Users cannot insert/update/delete matches
-- Matches are computed and stored by server logic only
drop policy if exists "Only server can manage job matches" on job_matches;
create policy "Only server can manage job matches"
  on job_matches
  for insert
  with check (user_id = auth.uid()); -- Allow inserts only from authenticated users

-- Note: Direct updates/deletes are prevented by default
-- Matches should be recomputed via API endpoint instead
