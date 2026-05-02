# Medication Schedule App

## Tech stack

- **Runtime:** Node.js 18+ (recommended 20 LTS)
- **UI:** React 18
- **Bundler/dev server:** Vite 5
- **Deployment platform:** Vercel

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. Vercel will detect `vercel.json` + Vite settings.
4. Build command: `npm run build`
5. Output directory: `dist`

## Supabase setup and required tables

The previous example referenced a `todos` table, but this app tracks medication history.
For this codebase, the **required table** is:

- `public.medication_events`

Apply the SQL in `supabase-schema.sql` in the Supabase SQL editor.

### Why only one table is required

This app currently stores plan defaults (`regular`, `prn`) in the frontend code and keeps settings in local state.
So the only backend persistence needed to start syncing data is medication event history.

### Optional future tables

If you later want full cloud sync for everything, add:

- `public.user_settings` (notification + spacing preferences)
- `public.user_plans` (custom plan names, intervals, base times)


### Table schema and existence

- The schema is defined in `supabase-schema.sql`.
- These tables do **not** exist automatically in a new Supabase project.
- You must run the SQL script in your Supabase project's SQL Editor to create them.

Required for basic persistence:

- `public.medication_events`

Required for full cloud sync of settings and plans:

- `public.user_settings`
- `public.user_plans`


### Frontend Supabase env vars

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key
```

Enable **Email/Password** in Supabase Auth (Authentication → Providers → Email) so users can sign in from the app.

## Single-user setup (shared table + app-level login)

This app is a one-user tracker. Keep it simple:

- Use Supabase Auth only for app login (email/password).
- Do not use RLS policies for `medication_events`.
- Use one shared `public.medication_events` table.

Recommended table for this app:

```sql
create table if not exists public.medication_events (
  id uuid primary key default gen_random_uuid(),
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
```
