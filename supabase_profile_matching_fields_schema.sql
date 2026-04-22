-- Chakri AI: Matching profile fields migration
-- Run this once in Supabase SQL editor to enable smart matching inputs on profiles.

begin;

alter table profiles add column if not exists target_role text;
alter table profiles add column if not exists preferred_location text;
alter table profiles add column if not exists years_experience int;

alter table profiles drop constraint if exists profiles_years_experience_check;
alter table profiles
  add constraint profiles_years_experience_check
  check (years_experience is null or (years_experience >= 0 and years_experience <= 60));

commit;
