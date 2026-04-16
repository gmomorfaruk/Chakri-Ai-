-- Chakri AI Profile Module Schema
-- Run these in your Supabase SQL editor

-- 1. User Profile
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  bio text,
  avatar_url text,
  theme text default 'default',
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- 2. Education
create table if not exists educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_year int,
  end_year int,
  grade text,
  description text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 3. Skills
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  level text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 4. Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  url text,
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 5. Experience
create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  company text not null,
  title text not null,
  start_date date,
  end_date date,
  description text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 6. Documents (metadata only)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  url text not null,
  type text,
  uploaded_at timestamp with time zone default timezone('utc', now())
);

-- Row Level Security (RLS)
-- Enable RLS for all tables
alter table profiles enable row level security;
alter table educations enable row level security;
alter table skills enable row level security;
alter table projects enable row level security;
alter table experiences enable row level security;
alter table documents enable row level security;

-- RLS Policies: Only allow users to access their own data
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can manage their own educations" on educations for all using (auth.uid() = user_id);
create policy "Users can manage their own skills" on skills for all using (auth.uid() = user_id);
create policy "Users can manage their own projects" on projects for all using (auth.uid() = user_id);
create policy "Users can manage their own experiences" on experiences for all using (auth.uid() = user_id);
create policy "Users can manage their own documents" on documents for all using (auth.uid() = user_id);

-- Public portfolio read policies (for /u/{username})
-- Safe to run repeatedly.
drop policy if exists "Public can view enabled profiles" on profiles;
drop policy if exists "Public can view educations for enabled profiles" on educations;
drop policy if exists "Public can view skills for enabled profiles" on skills;
drop policy if exists "Public can view projects for enabled profiles" on projects;
drop policy if exists "Public can view experiences for enabled profiles" on experiences;
drop policy if exists "Public can view documents for enabled profiles" on documents;

create policy "Public can view enabled profiles"
on profiles
for select
using (is_public = true);

create policy "Public can view educations for enabled profiles"
on educations
for select
using (exists (
  select 1 from profiles p where p.id = educations.user_id and p.is_public = true
));

create policy "Public can view skills for enabled profiles"
on skills
for select
using (exists (
  select 1 from profiles p where p.id = skills.user_id and p.is_public = true
));

create policy "Public can view projects for enabled profiles"
on projects
for select
using (exists (
  select 1 from profiles p where p.id = projects.user_id and p.is_public = true
));

create policy "Public can view experiences for enabled profiles"
on experiences
for select
using (exists (
  select 1 from profiles p where p.id = experiences.user_id and p.is_public = true
));

create policy "Public can view documents for enabled profiles"
on documents
for select
using (exists (
  select 1 from profiles p where p.id = documents.user_id and p.is_public = true
));
