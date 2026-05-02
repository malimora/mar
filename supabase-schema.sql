-- Supabase schema for Medication Schedule app persistence.
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1) Per-user medication events (required for history persistence)
create table if not exists public.medication_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('regular', 'prn')),
  status text not null check (status in ('taken', 'skipped', 'not-needed')),
  actual_at timestamptz not null,
  note text not null default '',
  pain_before int check (pain_before between 0 and 10),
  pain_after int check (pain_after between 0 and 10),
  contains_tramadol boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medication_events_user_actual_idx
  on public.medication_events (user_id, actual_at desc);

-- 2) Per-user app settings (optional, needed for full cloud sync)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tramadol_spacing_minutes int not null default 240 check (tramadol_spacing_minutes >= 0),
  reminders jsonb not null default '{"regularDue": true, "prnCheckIn": true, "missedRegular": true, "midnightDose": true}'::jsonb,
  history_filter text not null default '7d' check (history_filter in ('today', '3d', '7d', 'all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Per-user medication plans (optional, needed for full cloud sync)
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('regular', 'prn')),
  label text not null,
  medication text not null,
  interval_minutes int not null check (interval_minutes > 0),
  base_times text[] not null,
  contains_tramadol boolean not null default false,
  kind text not null check (kind in ('required', 'optional')),
  paracetamol_mg int not null default 0 check (paracetamol_mg >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create index if not exists user_plans_user_idx
  on public.user_plans (user_id);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medication_events_set_updated_at on public.medication_events;
create trigger medication_events_set_updated_at
before update on public.medication_events
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists user_plans_set_updated_at on public.user_plans;
create trigger user_plans_set_updated_at
before update on public.user_plans
for each row execute function public.set_updated_at();

-- Row-level security
alter table public.medication_events enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_plans enable row level security;

-- medication_events policies
create policy "events_select_own"
  on public.medication_events for select
  using (auth.uid() = user_id);
create policy "events_insert_own"
  on public.medication_events for insert
  with check (auth.uid() = user_id);
create policy "events_update_own"
  on public.medication_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "events_delete_own"
  on public.medication_events for delete
  using (auth.uid() = user_id);

-- user_settings policies
create policy "settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);
create policy "settings_upsert_own"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_plans policies
create policy "plans_select_own"
  on public.user_plans for select
  using (auth.uid() = user_id);
create policy "plans_write_own"
  on public.user_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
