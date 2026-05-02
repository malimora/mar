-- One-time fix for existing projects where RLS/policies were not applied.
-- Run in Supabase SQL Editor.

alter table public.medication_events enable row level security;

-- Clean re-create policies to avoid name conflicts/drift.
drop policy if exists "events_select_own" on public.medication_events;
drop policy if exists "events_insert_own" on public.medication_events;
drop policy if exists "events_update_own" on public.medication_events;
drop policy if exists "events_delete_own" on public.medication_events;

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
