-- Chakri AI Job System MVP Schema (Step 1)
-- Stack: Supabase Postgres + RLS + Realtime
-- Run after profiles table exists.

begin;

-- Admin role support used by moderation policies
alter table if exists profiles add column if not exists role text default 'user';
alter table if exists profiles drop constraint if exists profiles_role_check;
alter table if exists profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;

-- 1) jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  description text not null,
  required_skills text[] not null default '{}',
  experience_min int,
  experience_max int,
  source text,
  source_url text,
  status text not null default 'pending',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table jobs drop constraint if exists jobs_status_check;
alter table jobs add constraint jobs_status_check check (status in ('pending', 'approved', 'rejected'));
alter table jobs drop constraint if exists jobs_experience_range_check;
alter table jobs add constraint jobs_experience_range_check check (
  experience_min is null
  or experience_max is null
  or experience_min <= experience_max
);

create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_created_at on jobs(created_at desc);

-- 2) job_sources
create table if not exists job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null,
  source_url text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table job_sources drop constraint if exists job_sources_type_check;
alter table job_sources
  add constraint job_sources_type_check check (source_type in ('manual', 'rss', 'api', 'scrape'));

-- 3) job_applications
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null default 'saved',
  applied_date date,
  follow_up_date date,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table job_applications drop constraint if exists job_applications_status_check;
alter table job_applications
  add constraint job_applications_status_check check (status in ('saved', 'applied', 'interview', 'offer', 'rejected'));

create index if not exists idx_job_applications_user_id on job_applications(user_id);
create index if not exists idx_job_applications_status on job_applications(status);
create unique index if not exists idx_job_applications_user_job_unique on job_applications(user_id, job_id);

-- 4) job_matches
create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  skill_score numeric(5,2) not null default 0,
  role_score numeric(5,2) not null default 0,
  location_score numeric(5,2) not null default 0,
  experience_score numeric(5,2) not null default 0,
  total_score numeric(5,2) not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists idx_job_matches_user_id on job_matches(user_id);
create index if not exists idx_job_matches_total_score on job_matches(total_score desc);
create unique index if not exists idx_job_matches_user_job_unique on job_matches(user_id, job_id);

-- 5) notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table notifications add column if not exists read boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'is_read'
  ) then
    execute 'update notifications set read = coalesce(is_read, false)';
  end if;
end
$$;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check check (type in ('new_job', 'job_match', 'reminder', 'job', 'task', 'follow_up', 'system'));

create index if not exists idx_notifications_user_read on notifications(user_id, read, created_at desc);

-- RLS
alter table jobs enable row level security;
alter table job_sources enable row level security;
alter table job_applications enable row level security;
alter table job_matches enable row level security;
alter table notifications enable row level security;

-- jobs visibility: approved public, creator, admin
drop policy if exists "Approved jobs are public" on jobs;
create policy "Approved jobs are public"
  on jobs
  for select
  using (status = 'approved');

drop policy if exists "Users can view own created jobs" on jobs;
create policy "Users can view own created jobs"
  on jobs
  for select
  using (auth.uid() = created_by);

drop policy if exists "Users can insert own jobs pending" on jobs;
create policy "Users can insert own jobs pending"
  on jobs
  for insert
  with check (auth.uid() = created_by and status = 'pending');

drop policy if exists "Users can update own pending jobs" on jobs;
create policy "Users can update own pending jobs"
  on jobs
  for update
  using (auth.uid() = created_by and status = 'pending')
  with check (auth.uid() = created_by and status = 'pending');

drop policy if exists "Admins can moderate jobs" on jobs;
create policy "Admins can moderate jobs"
  on jobs
  for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

drop policy if exists "Admins can delete jobs" on jobs;
create policy "Admins can delete jobs"
  on jobs
  for delete
  using (is_admin(auth.uid()));

-- job_sources: admin only
drop policy if exists "Admins can read job sources" on job_sources;
create policy "Admins can read job sources"
  on job_sources
  for select
  using (is_admin(auth.uid()));

drop policy if exists "Admins can manage job sources" on job_sources;
create policy "Admins can manage job sources"
  on job_sources
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- job_applications: owner only
drop policy if exists "Users manage own job applications" on job_applications;
create policy "Users manage own job applications"
  on job_applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- job_matches: owner read, admin/system insert-update
drop policy if exists "Users view own job matches" on job_matches;
create policy "Users view own job matches"
  on job_matches
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins manage job matches" on job_matches;
create policy "Admins manage job matches"
  on job_matches
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- notifications: owner only
drop policy if exists "Users view own notifications" on notifications;
create policy "Users view own notifications"
  on notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on notifications;
create policy "Users update own notifications"
  on notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can insert notifications" on notifications;
create policy "Admins can insert notifications"
  on notifications
  for insert
  with check (is_admin(auth.uid()));

commit;
