# Chakri AI

AI-powered career preparation and job management platform built with Next.js + Supabase.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Bilingual UI (English/Bangla)
- Theme support (dark/light)

## Modules Implemented

- Authentication (sign in / sign up / sign out)
- Profile Builder (education, skills, projects, experience, documents)
- Public Portfolio (`/u/[username]`)
- Jobs Hub + Tracker + Admin Moderation
- Career DNA Job Matching
- AI Career Coach (chat + answer evaluation)
- Voice Viva Practice (browser speech APIs)
- Roadmap + Tasks + Quiz Practice
- Notifications + Activity Logs + Security Events + Admin Dashboard

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AI_PROVIDER=mock
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
```

3. Run database SQL migrations in order (Supabase SQL editor)

1. `supabase_profile_schema.sql`
2. `supabase_portfolio_schema.sql`
3. `supabase_jobs_schema.sql`
4. `supabase_coach_schema.sql`
5. `supabase_tasks_schema.sql`
6. `supabase_notifications_schema.sql`

4. Start app

```bash
npm run dev
```

## Free Now, Paid Later AI Setup

The app runs fully with mock AI by default.

- Current (free): `AI_PROVIDER=mock`
- Later (paid): set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY`

No code changes required when switching providers.

## Voice Viva Notes

Voice module uses browser-native APIs:

- Speech-to-text: `SpeechRecognition` / `webkitSpeechRecognition`
- Text-to-speech: `speechSynthesis`

For best compatibility, use recent Chrome or Edge.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Production Readiness

- Security headers configured in `next.config.ts`
- SEO metadata configured in `app/layout.tsx`
- `robots.txt` via `app/robots.ts`
- `sitemap.xml` via `app/sitemap.ts`
- Global and dashboard error/loading boundaries added

## Deployment Checklist

1. Set all required environment variables in hosting platform.
2. Apply all SQL migration files to the target Supabase project.
3. Confirm at least one admin user (`profiles.role = 'admin'`) exists.
4. Run `npm run build` before deployment.
5. Deploy (Vercel recommended for Next.js).

## Default Routes

- Public: `/`, `/jobs`, `/u/[username]`, `/sign-in`, `/sign-up`
- Dashboard: `/dashboard`, `/dashboard/profile`, `/dashboard/portfolio`, `/dashboard/jobs`, `/dashboard/ai`, `/dashboard/tasks`, `/dashboard/notifications`, `/dashboard/admin`
