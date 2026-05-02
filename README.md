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

## Supabase setup

1. Run `supabase-schema.sql` in your Supabase SQL editor.
2. Create a `.env.local` file:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PROFILE_ID=uuid-for-this-patient-or-user
```

Notes:
- If env vars are missing, the app falls back to localStorage only.
- Current sync mode rewrites the event rows from app state on each save (simple + reliable for single-user use).
