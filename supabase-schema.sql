-- Run in Supabase SQL editor
create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  profile_id uuid primary key,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.dose_events (
  id text primary key,
  profile_id uuid not null,
  plan_id text not null,
  status text not null check (status in ('taken','skipped','not-needed')),
  actual_at timestamptz not null,
  note text not null default '',
  pain_before int,
  pain_after int,
  contains_tramadol boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dose_events_profile_actual_idx on public.dose_events(profile_id, actual_at);
