-- Chakri AI Admin Approval Workflow
-- Centralized moderation requests for profile updates, user activities, and other reviewable actions.

create extension if not exists pgcrypto;

-- Admin checks rely on profiles.role. Ensure it exists before creating helper functions/policies.
alter table if exists profiles add column if not exists role text default 'user';
alter table if exists profiles drop constraint if exists profiles_role_check;
alter table if exists profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

create table if not exists admin_approval_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references profiles(id) on delete cascade,
  request_type text not null,
  resource_type text not null,
  resource_id text,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  review_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table admin_approval_requests
  drop constraint if exists admin_approval_requests_status_check;

alter table admin_approval_requests
  add constraint admin_approval_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table admin_approval_requests
  drop constraint if exists admin_approval_requests_type_check;

alter table admin_approval_requests
  add constraint admin_approval_requests_type_check
  check (request_type in ('profile_update', 'portfolio_publish', 'user_activity', 'job_application'));

create index if not exists idx_admin_approval_requests_status_created
  on admin_approval_requests(status, created_at desc);

create index if not exists idx_admin_approval_requests_requester
  on admin_approval_requests(requested_by);

create index if not exists idx_admin_approval_requests_resource
  on admin_approval_requests(resource_type, resource_id);

alter table admin_approval_requests enable row level security;

-- Ensure helper function exists (used by admin policies)
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

drop policy if exists "Users can create own approval requests" on admin_approval_requests;
create policy "Users can create own approval requests"
  on admin_approval_requests
  for insert
  with check (auth.uid() = requested_by);

drop policy if exists "Users can read own approval requests" on admin_approval_requests;
create policy "Users can read own approval requests"
  on admin_approval_requests
  for select
  using (auth.uid() = requested_by);

drop policy if exists "Admins can view approval requests" on admin_approval_requests;
create policy "Admins can view approval requests"
  on admin_approval_requests
  for select
  using (is_admin(auth.uid()));

drop policy if exists "Admins can moderate approval requests" on admin_approval_requests;
create policy "Admins can moderate approval requests"
  on admin_approval_requests
  for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Allow admins to apply moderation side-effects on profiles (for example, portfolio visibility).
drop policy if exists "Admins can update profiles for moderation" on profiles;
create policy "Admins can update profiles for moderation"
  on profiles
  for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Optional: prevent direct deletes from clients.
