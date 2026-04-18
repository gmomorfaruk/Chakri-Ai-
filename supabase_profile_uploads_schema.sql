-- Chakri AI Profile Uploads + Admin Approval Alerts
-- Run after profile, notifications, and admin approval schemas.

-- 1) Storage bucket for profile images and user documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read is required for direct avatar/document links in profile/public portfolio.
drop policy if exists "Public can read profile assets" on storage.objects;
create policy "Public can read profile assets"
  on storage.objects
  for select
  using (bucket_id = 'profile-assets');

-- Users can create objects only inside their own folder: {user_id}/...
drop policy if exists "Users can upload own profile assets" on storage.objects;
create policy "Users can upload own profile assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update/delete only their own files in their own folder.
drop policy if exists "Users can update own profile assets" on storage.objects;
create policy "Users can update own profile assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'profile-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own profile assets" on storage.objects;
create policy "Users can delete own profile assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2) Auto-notify admins when any approval request is submitted
create or replace function notify_admins_on_approval_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_name text;
begin
  select coalesce(nullif(full_name, ''), nullif(username, ''), 'A user')
    into requester_name
  from profiles
  where id = new.requested_by;

  insert into notifications (user_id, type, title, message, link)
  select
    p.id,
    'system',
    'New approval request',
    requester_name || ' submitted a ' || replace(new.request_type, '_', ' ') || ' request for review.',
    '/dashboard/admin'
  from profiles p
  where p.role = 'admin';

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.admin_approval_requests') is not null then
    execute 'drop trigger if exists trg_notify_admins_on_approval_request on public.admin_approval_requests';
    execute 'create trigger trg_notify_admins_on_approval_request after insert on public.admin_approval_requests for each row execute function notify_admins_on_approval_request()';
  else
    raise notice 'Skipping admin approval trigger creation: public.admin_approval_requests table not found.';
  end if;
end
$$;
