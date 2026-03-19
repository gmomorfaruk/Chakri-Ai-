-- Chakri AI Jobs Module (Phase 4)
-- Run after profile and portfolio schemas

-- Add role support for admin workflows
alter table profiles add column if not exists role text default 'user';
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user', 'admin'));

-- Job posts submitted by users and moderated by admins
create table if not exists job_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  company text not null,
  location text,
  description text not null,
  apply_url text,
  status text not null default 'pending', -- pending | approved | rejected
  moderation_note text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table job_posts drop constraint if exists job_posts_status_check;
alter table job_posts add constraint job_posts_status_check check (status in ('pending', 'approved', 'rejected'));

-- User application tracker
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_post_id uuid references job_posts(id) on delete set null,
  role_title text not null,
  company text not null,
  status text not null default 'applied', -- applied | screening | interview | offer | rejected | hired
  applied_at date default current_date,
  follow_up_date date,
  notes text,
  ai_followup_draft text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table job_applications drop constraint if exists job_applications_status_check;
alter table job_applications add constraint job_applications_status_check check (status in ('applied', 'screening', 'interview', 'offer', 'rejected', 'hired'));

-- Enable RLS
alter table job_posts enable row level security;
alter table job_applications enable row level security;

-- Helper admin function for policies
create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Job post policies
-- Anyone can see approved jobs (public list)
drop policy if exists "Anyone can view approved job posts" on job_posts;
create policy "Anyone can view approved job posts"
  on job_posts
  for select
  using (status = 'approved');

-- Users can view their own posts as well
drop policy if exists "Users can view their own job posts" on job_posts;
create policy "Users can view their own job posts"
  on job_posts
  for select
  using (auth.uid() = user_id);

-- Users can create their own posts
drop policy if exists "Users can create own job posts" on job_posts;
create policy "Users can create own job posts"
  on job_posts
  for insert
  with check (auth.uid() = user_id);

-- Users can update/delete only their own posts while pending
drop policy if exists "Users can update own pending posts" on job_posts;
create policy "Users can update own pending posts"
  on job_posts
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pending posts" on job_posts;
create policy "Users can delete own pending posts"
  on job_posts
  for delete
  using (auth.uid() = user_id and status = 'pending');

-- Admin full moderation control
-- Note: using auth.uid() directly avoids explicit role column in auth.users
drop policy if exists "Admins can manage all job posts" on job_posts;
create policy "Admins can manage all job posts"
  on job_posts
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Job application policies: only owner access
drop policy if exists "Users can manage own job applications" on job_applications;
create policy "Users can manage own job applications"
  on job_applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
