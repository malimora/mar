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

Also enable **Anonymous sign-ins** in Supabase Auth if you want this app to persist data without a full login flow.


### If `medication_events` shows "RLS Disabled" in Supabase

If Supabase table settings show **RLS Disabled** and **No policies created yet**, run `supabase-rls-fix.sql` in the SQL Editor.

After running it, confirm:

- `public.medication_events` shows **RLS Enabled**
- Policies exist: `events_select_own`, `events_insert_own`, `events_update_own`, `events_delete_own`

Validation query:

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'medication_events'
order by policyname;
```

## Troubleshooting: why `medication_events` can stay empty

If you see an empty `public.medication_events` table, verify these app behaviors and Supabase settings:

1. **Writes only happen after logging an event in the UI**
   - The app does not seed rows on startup.
2. **Rows are scoped per authenticated user**
   - The app queries with `.eq("user_id", user.id)` and RLS also enforces `auth.uid() = user_id`.
   - Different browsers/devices/sessions (different anonymous users) will not see each other's rows.
3. **Anonymous sign-in must be enabled**
   - If anonymous auth is disabled, inserts will fail because no user id is available.
4. **Env vars must be present at build/runtime**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - When missing, Supabase client is disabled in this frontend.
5. **Schema + policies must be applied**
   - Run `supabase-schema.sql` in your Supabase SQL Editor.

Recommended quick check flow:

- Open app, log one event, then query Supabase SQL:

```sql
select id, user_id, plan_id, status, actual_at, created_at
from public.medication_events
order by created_at desc
limit 20;
```
