create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1) Dose event header table
-- One row = one logged dose occurrence.
-- ------------------------------------------------------------

create table public.dose_events (
  id uuid primary key default gen_random_uuid(),

  plan_id text not null check (plan_id in 
('regular', 'prn')),

  status text not null check (
    status in ('taken', 'skipped', 'not-needed')
  ),

  scheduled_for timestamptz,
  actual_at timestamptz not null,

  note text not null default '',

  pain_before int check (pain_before between 0 and 10),
  pain_after int check (pain_after between 0 and 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dose_events_actual_idx
  on public.dose_events (actual_at desc);

create index dose_events_plan_actual_idx
  on public.dose_events (plan_id, actual_at desc);

create index dose_events_status_actual_idx
  on public.dose_events (status, actual_at desc);

-- ------------------------------------------------------------
-- 2) Dose event items table
-- Each row = one medication actually taken.
-- ------------------------------------------------------------

create table public.dose_event_items (
  id uuid primary key default gen_random_uuid(),

  dose_event_id uuid not null
    references public.dose_events(id)
    on delete cascade,

  medication_code text not null check (
    medication_code in ('paracetamol', 'tramadol')
  ),

  dose_mg int not null check (dose_mg > 0),

  created_at timestamptz not null default now(),

  unique (dose_event_id, medication_code)
);

create index dose_event_items_event_idx
  on public.dose_event_items (dose_event_id);

create index dose_event_items_medication_idx
  on public.dose_event_items (medication_code);

create index dose_event_items_medication_event_idx
  on public.dose_event_items (medication_code, dose_event_id);

-- ------------------------------------------------------------
-- 3) Single-user app settings
-- One-row table.
-- ------------------------------------------------------------

create table public.user_settings (
  id int primary key default 1 check (id = 1),

  tramadol_spacing_minutes int not null default 240
    check (tramadol_spacing_minutes >= 0),

  reminders jsonb not null default
    '{"regularDue": true, "prnCheckIn": true, "missedRegular": true, "midnightDose": true}'::jsonb,

  history_filter text not null default '7d'
    check (history_filter in ('today', '3d', '7d', 'all')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_settings (
  id,
  tramadol_spacing_minutes,
  reminders,
  history_filter
)
values (
  1,
  240,
  '{"regularDue": true, "prnCheckIn": true, "missedRegular": true, "midnightDose": true}'::jsonb,
  '7d'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4) Single-user medication plans
-- One row per plan_id.
-- ------------------------------------------------------------

create table public.user_plans (
  id uuid primary key default gen_random_uuid(),

  plan_id text not null check (plan_id in ('regular', 'prn')),

  label text not null,
  medication text not null,

  interval_minutes int not null check (interval_minutes > 0),

  base_times text[] not null,

  contains_tramadol boolean not null default false,

  kind text not null check (kind in ('required', 'optional')),

  paracetamol_mg int not null default 0
    check (paracetamol_mg >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id)
);

create index user_plans_plan_idx
  on public.user_plans (plan_id);

-- Default demo plans.
-- Adjust base_times if your UI expects different strings.
insert into public.user_plans (
  plan_id,
  label,
  medication,
  interval_minutes,
  base_times,
  contains_tramadol,
  kind,
  paracetamol_mg
)
values
  (
    'regular',
    'Regular dose',
    'Paracetamol 500mg + Tramadol 15mg',
    360,
    array['06:00', '12:00', '18:00', '00:00'],
    true,
    'required',
    500
  ),
  (
    'prn',
    'Optional breakthrough dose',
    'Tramadol 15mg',
    360,
    array['10:00', '16:00', '22:00'],
    true,
    'optional',
    0
  )
on conflict (plan_id) do nothing;

-- ------------------------------------------------------------
-- 5) updated_at trigger helper
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dose_events_set_updated_at
before update on public.dose_events
for each row
execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

create trigger user_plans_set_updated_at
before update on public.user_plans
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 6) One-way migration from old medication_events
-- ------------------------------------------------------------
-- Assumptions about old public.medication_events:
-- id, plan_id, status, actual_at, note,
-- pain_before, pain_after, created_at, updated_at,
-- contains_tramadol
--
-- No user_id needed.
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'medication_events'
  ) then

    insert into public.dose_events (
      id,
      plan_id,
      status,
      scheduled_for,
      actual_at,
      note,
      pain_before,
      pain_after,
      created_at,
      updated_at
    )
    select
      me.id,
      me.plan_id,
      me.status,
      null,
      me.actual_at,
      coalesce(me.note, ''),
      me.pain_before,
      me.pain_after,
      me.created_at,
      me.updated_at
    from public.medication_events me
    where not exists (
      select 1
      from public.dose_events de
      where de.id = me.id
    );

    -- Tramadol backfill.
    -- Regular rows only get tramadol if the old boolean says so.
    -- PRN rows are assumed to be tramadol if status = taken.
    insert into public.dose_event_items (
      dose_event_id,
      medication_code,
      dose_mg
    )
    select
      me.id,
      'tramadol',
      15
    from public.medication_events me
    where me.status = 'taken'
      and (
        me.contains_tramadol = true
        or me.plan_id = 'prn'
      )
      and not exists (
        select 1
        from public.dose_event_items i
        where i.dose_event_id = me.id
          and i.medication_code = 'tramadol'
      );

    -- Paracetamol backfill.
    -- Old regular taken rows are assumed to include paracetamol 500mg.
    insert into public.dose_event_items (
      dose_event_id,
      medication_code,
      dose_mg
    )
    select
      me.id,
      'paracetamol',
      500
    from public.medication_events me
    where me.status = 'taken'
      and me.plan_id = 'regular'
      and not exists (
        select 1
        from public.dose_event_items i
        where i.dose_event_id = me.id
          and i.medication_code = 'paracetamol'
      );

  end if;
end $$;

-- ------------------------------------------------------------
-- 7) Status/item validation
-- ------------------------------------------------------------
-- Rule:
-- taken      => must have at least one dose_event_item
-- skipped    => must have zero dose_event_items
-- not-needed => must have zero dose_event_items
-- ------------------------------------------------------------

create or replace function public.validate_one_dose_event(
  p_dose_event_id uuid
)
returns void
language plpgsql
as $$
declare
  v_status text;
  v_item_count int;
begin
  select status
  into v_status
  from public.dose_events
  where id = p_dose_event_id;

  -- Parent may already be deleted during cascade delete.
  if v_status is null then
    return;
  end if;

  select count(*)
  into v_item_count
  from public.dose_event_items
  where dose_event_id = p_dose_event_id;

  if v_status = 'taken' and v_item_count = 0 then
    raise exception 'taken events must have at least one dose_event_item';
  end if;

  if v_status in ('skipped', 'not-needed') and v_item_count > 0 then
    raise exception 'skipped/not-needed events cannot have dose_event_items';
  end if;
end;
$$;

create or replace function public.validate_dose_event_items()
returns trigger
language plpgsql
as $$
begin
  -- Trigger fired from parent table.
  if TG_TABLE_NAME = 'dose_events' then
    perform public.validate_one_dose_event(new.id);
    return new;
  end if;

  -- Trigger fired from child table.
  if TG_TABLE_NAME = 'dose_event_items' then

    -- Validate old parent when item is updated/deleted.
    if TG_OP in ('UPDATE', 'DELETE') then
      perform public.validate_one_dose_event(old.dose_event_id);
    end if;

    -- Validate new parent when item is inserted/updated.
    if TG_OP in ('INSERT', 'UPDATE') then
      perform public.validate_one_dose_event(new.dose_event_id);
    end if;

    if TG_OP = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  return new;
end;
$$;

create constraint trigger dose_events_validate_items
after insert or update on public.dose_events
deferrable initially deferred
for each row
execute function public.validate_dose_event_items();

create constraint trigger dose_event_items_validate_parent
after insert or update or delete on public.dose_event_items
deferrable initially deferred
for each row
execute function public.validate_dose_event_items();

-- ------------------------------------------------------------
-- 8) RPC for logging a dose atomically
-- ------------------------------------------------------------
-- Use this from Supabase instead of inserting parent and child rows separately.
--
-- For status = taken:
-- p_items example:
-- [
--   {"medication_code": "paracetamol", "dose_mg": 500},
--   {"medication_code": "tramadol", "dose_mg": 15}
-- ]
--
-- For status = skipped/not-needed:
-- p_items should be [].
-- ------------------------------------------------------------

create or replace function public.log_dose_event(
  p_plan_id text,
  p_status text,
  p_actual_at timestamptz default now(),
  p_scheduled_for timestamptz default null,
  p_note text default '',
  p_pain_before int default null,
  p_pain_after int default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_event_id uuid;
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  if p_status = 'taken' and jsonb_array_length(v_items) = 0 then
    raise exception 'taken events require at least one medication item';
  end if;

  if p_status in ('skipped', 'not-needed') and jsonb_array_length(v_items) > 0 then
    raise exception 'skipped/not-needed events cannot have medication items';
  end if;

  insert into public.dose_events (
    plan_id,
    status,
    scheduled_for,
    actual_at,
    note,
    pain_before,
    pain_after
  )
  values (
    p_plan_id,
    p_status,
    p_scheduled_for,
    p_actual_at,
    coalesce(p_note, ''),
    p_pain_before,
    p_pain_after
  )
  returning id into v_event_id;

  if p_status = 'taken' then
    insert into public.dose_event_items (
      dose_event_id,
      medication_code,
      dose_mg
    )
    select
      v_event_id,
      x.medication_code,
      x.dose_mg
    from jsonb_to_recordset(v_items) as x(
      medication_code text,
      dose_mg int
    );
  end if;

  return v_event_id;
end;
$$;

-- ------------------------------------------------------------
-- 9) Explicitly keep RLS disabled for demo simplicity
-- ------------------------------------------------------------

alter table public.dose_events disable row level security;
alter table public.dose_event_items disable row level security;
alter table public.user_settings disable row level security;
alter table public.user_plans disable row level security;
