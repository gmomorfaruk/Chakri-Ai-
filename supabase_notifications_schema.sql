-- Chakri AI Phase 9: Notifications + Admin + Logs Foundation
-- Run after previous schemas

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- job, task, follow_up, system
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('job', 'task', 'follow_up', 'system'));

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text,
  resource_id text,
  severity text default 'info', -- info | warning | critical
  source text default 'app', -- app | api | auth | security
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table activity_logs drop constraint if exists activity_logs_severity_check;
alter table activity_logs add constraint activity_logs_severity_check check (severity in ('info', 'warning', 'critical'));

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  event_name text not null,
  level text not null default 'low', -- low | medium | high | critical
  source text default 'app',
  status text default 'open', -- open | acknowledged | resolved
  details jsonb,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table security_events drop constraint if exists security_events_level_check;
alter table security_events add constraint security_events_level_check check (level in ('low', 'medium', 'high', 'critical'));
alter table security_events drop constraint if exists security_events_status_check;
alter table security_events add constraint security_events_status_check check (status in ('open', 'acknowledged', 'resolved'));

alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table security_events enable row level security;

-- Notifications policies
drop policy if exists "Users can manage own notifications" on notifications;
create policy "Users can manage own notifications"
  on notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can insert notifications" on notifications;
create policy "Admins can insert notifications"
  on notifications
  for insert
  with check (is_admin(auth.uid()));

-- Activity logs policies: user can view own logs, admin can view all
-- Requires is_admin(uid) helper function from jobs schema; if missing, create it before these policies
drop policy if exists "Users can view own activity logs" on activity_logs;
create policy "Users can view own activity logs"
  on activity_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "System can insert activity logs" on activity_logs;
create policy "System can insert activity logs"
  on activity_logs
  for insert
  with check (auth.uid() = user_id or is_admin(auth.uid()));

drop policy if exists "Admins can view all activity logs" on activity_logs;
create policy "Admins can view all activity logs"
  on activity_logs
  for select
  using (is_admin(auth.uid()));

-- Security events policies: admin-focused visibility
drop policy if exists "Admins can manage security events" on security_events;
create policy "Admins can manage security events"
  on security_events
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
