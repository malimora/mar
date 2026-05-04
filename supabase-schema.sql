-- Supabase schema for Medication Schedule app persistence.
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- New event header table.
create table if not exists public.dose_events (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null check (plan_id in ('regular-tramadol', 'regular-paracetamol', 'prn')),
  status text not null check (status in ('taken', 'skipped', 'not-needed')),
  scheduled_for timestamptz,
  actual_at timestamptz not null,
  note text not null default '',
  pain_before int check (pain_before between 0 and 10),
  pain_after int check (pain_after between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dose_events_actual_idx
  on public.dose_events (actual_at desc);

-- Child items: each row means a medication was actually taken.
create table if not exists public.dose_event_items (
  id uuid primary key default gen_random_uuid(),
  dose_event_id uuid not null references public.dose_events(id) on delete cascade,
  medication_code text not null check (medication_code in ('paracetamol', 'tramadol')),
  dose_mg int not null check (dose_mg > 0),
  created_at timestamptz not null default now(),
  unique (dose_event_id, medication_code)
);

create index if not exists dose_event_items_event_idx
  on public.dose_event_items (dose_event_id);

-- 2) Per-user app settings
create table if not exists public.user_settings (
  id int primary key default 1 check (id = 1),
  tramadol_spacing_minutes int not null default 240 check (tramadol_spacing_minutes >= 0),
  reminders jsonb not null default '{"regularDue": true, "prnCheckIn": true, "missedRegular": true, "midnightDose": true}'::jsonb,
  history_filter text not null default '7d' check (history_filter in ('today', '3d', '7d', 'all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- 3) Shared medication plans
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null unique check (plan_id in ('regular-tramadol', 'regular-paracetamol', 'prn')),
  label text not null,
  medication text not null,
  interval_minutes int not null check (interval_minutes > 0),
  base_times text[] not null,
  kind text not null check (kind in ('required', 'optional')),
  paracetamol_mg int not null default 0 check (paracetamol_mg >= 0),
  tramadol_mg int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_plans_plan_idx on public.user_plans (plan_id);

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

-- Enforce status/item consistency.
create or replace function public.validate_dose_event_items()
returns trigger
language plpgsql
as $$
declare
  item_count int;
begin
  select count(*) into item_count
  from public.dose_event_items
  where dose_event_id = new.id;

  if new.status = 'taken' and item_count = 0 then
    raise exception 'taken events must have at least one dose_event_item';
  end if;

  if new.status in ('skipped', 'not-needed') and item_count > 0 then
    raise exception 'skipped/not-needed events cannot have dose_event_items';
  end if;

  return new;
end;
$$;

drop trigger if exists dose_events_set_updated_at on public.dose_events;
create trigger dose_events_set_updated_at
before update on public.dose_events
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists user_plans_set_updated_at on public.user_plans;
create trigger user_plans_set_updated_at
before update on public.user_plans
for each row execute function public.set_updated_at();


drop trigger if exists dose_events_validate_items on public.dose_events;
create constraint trigger dose_events_validate_items
after insert or update on public.dose_events
deferrable initially deferred
for each row execute function public.validate_dose_event_items();

drop trigger if exists dose_event_items_validate_parent on public.dose_event_items;
create constraint trigger dose_event_items_validate_parent
after insert or update or delete on public.dose_event_items
deferrable initially deferred
for each row execute function public.validate_dose_event_items();
