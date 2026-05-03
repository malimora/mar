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

## Supabase setup and required tables

This app now uses a normalized medication schema:

- `public.dose_events` (event header)
- `public.dose_event_items` (actual meds taken per event)

Apply the SQL in `supabase-schema.sql` in the Supabase SQL editor.

## Single-user setup (no RLS, no auth)

This app is currently intended as a one-user tracker:

- Do not use Supabase Auth.
- Do not use RLS policies for `dose_events` / `dose_event_items`.
- Use one shared `public.dose_events` + `public.dose_event_items` setup.

## Frontend Supabase env vars

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key
```
