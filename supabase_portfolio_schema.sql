-- Chakri AI Portfolio Module Migration (Phase 3)
-- Run after supabase_profile_schema.sql

-- Add username to profiles for public URL routing: /u/[username]
alter table profiles add column if not exists username text;

-- Enforce unique, normalized usernames where provided
create unique index if not exists profiles_username_unique_idx on profiles (lower(username)) where username is not null;

-- Basic format guard: letters, numbers, underscore, dot; 3-30 chars
alter table profiles drop constraint if exists profiles_username_format_check;
alter table profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-zA-Z0-9._]{3,30}$');

-- Public read policy for profile visibility
alter table profiles enable row level security;
drop policy if exists "Public can view public profiles" on profiles;
create policy "Public can view public profiles"
  on profiles
  for select
  using (is_public = true and username is not null);

-- Public read policies for section tables tied to a public profile
alter table educations enable row level security;
drop policy if exists "Public can view public educations" on educations;
create policy "Public can view public educations"
  on educations
  for select
  using (exists (
    select 1 from profiles p
    where p.id = educations.user_id
      and p.is_public = true
      and p.username is not null
  ));

alter table skills enable row level security;
drop policy if exists "Public can view public skills" on skills;
create policy "Public can view public skills"
  on skills
  for select
  using (exists (
    select 1 from profiles p
    where p.id = skills.user_id
      and p.is_public = true
      and p.username is not null
  ));

alter table projects enable row level security;
drop policy if exists "Public can view public projects" on projects;
create policy "Public can view public projects"
  on projects
  for select
  using (exists (
    select 1 from profiles p
    where p.id = projects.user_id
      and p.is_public = true
      and p.username is not null
  ));

alter table experiences enable row level security;
drop policy if exists "Public can view public experiences" on experiences;
create policy "Public can view public experiences"
  on experiences
  for select
  using (exists (
    select 1 from profiles p
    where p.id = experiences.user_id
      and p.is_public = true
      and p.username is not null
  ));

alter table documents enable row level security;
drop policy if exists "Public can view public documents" on documents;
create policy "Public can view public documents"
  on documents
  for select
  using (exists (
    select 1 from profiles p
    where p.id = documents.user_id
      and p.is_public = true
      and p.username is not null
  ));
