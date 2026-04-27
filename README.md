# Chakri AI

AI-powered career preparation and job management platform built with Next.js + Supabase.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Bilingual UI (English/Bangla)
- Theme support (dark/light)

## Project Structure

```
chakri-ai/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication pages (sign-in, sign-up)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard with sub-modules
│   │   │   ├── ai/        # AI Career Coach
│   │   │   ├── jobs/      # Job management
│   │   │   ├── profile/   # Profile builder
│   │   │   ├── portfolio/ # Portfolio management
│   │   │   ├── tasks/     # Tasks and roadmap
│   │   │   ├── learning/  # Learning AI
│   │   │   ├── admin/     # Admin dashboard
│   │   │   └── notifications/ # Notifications center
│   │   └── layout.tsx     # Dashboard layout wrapper
│   ├── api/               # API routes
│   │   ├── coach/         # AI Coach endpoints
│   │   ├── jobs/          # Job system endpoints
│   │   └── intelligence/  # Adaptive intelligence sync
│   ├── admin/             # Admin page
│   ├── ai-coach/          # AI Coach with voice viva
│   ├── jobs/              # Public jobs page
│   ├── profile/           # Public portfolio
│   └── u/[username]/      # Public user portfolio
├── components/            # Reusable React components
│   ├── coach/             # AI Coach components
│   ├── jobs/              # Job-related components
│   ├── learning/          # Learning AI components
│   ├── profile/           # Profile components
│   ├── portfolio/         # Portfolio components
│   ├── admin/             # Admin components
│   ├── tasks/             # Tasks components
│   ├── notifications/     # Notifications components
│   ├── layout/            # Layout components (navbar, shell)
│   └── providers/         # Context providers (Supabase, Theme, i18n)
├── lib/                   # Service layer and utilities
│   ├── supabaseClient.ts  # Client-side Supabase client
│   ├── supabaseServer.ts  # Server-side Supabase client
│   ├── *Service.ts        # Feature-specific services
│   ├── *Matching*.ts      # Job matching engine
│   └── i18n.ts            # Internationalization config
├── types/                 # TypeScript type definitions
│   ├── coach.ts           # AI Coach types
│   ├── jobs.ts            # Job system types
│   ├── profile.ts         # Profile types
│   ├── tasks.ts           # Tasks types
│   ├── admin.ts           # Admin types
│   └── notifications.ts   # Notifications types
├── messages/              # i18n localization files
│   ├── en.json            # English translations
│   └── bn.json            # Bengali translations
├── styles/                # Global styles
├── cypress/               # E2E tests
├── public/                # Static assets
└── *.sql                  # Supabase database schemas
```

## Architecture Overview

### AI Provider System
The application uses a pluggable AI provider pattern:
- **Mock Provider** (`AI_PROVIDER=mock`): Free, no API key required. Returns simulated responses for development.
- **OpenAI Provider** (`AI_PROVIDER=openai`): Production mode with real AI responses.
- Switching providers requires only an environment variable change — no code modifications.

### Supabase Architecture
- **Client-side**: `lib/supabaseClient.ts` for browser operations (auth, real-time subscriptions)
- **Server-side**: `lib/supabaseServer.ts` for API routes (admin operations, server actions)
- **RLS Policies**: Row Level Security enforced on all tables for data protection

### Feature Module Pattern
Each feature (Coach, Jobs, Profile, etc.) follows a consistent structure:
1. **Service layer** (`lib/*Service.ts`) — Data fetching and business logic
2. **Components** (`components/<feature>/`) — UI components
3. **Types** (`types/<feature>.ts`) — TypeScript interfaces
4. **API routes** (`app/api/<feature>/`) — Backend endpoints

### Data Flow
```
Component → Service → Supabase Client → Supabase Backend
                ↓
          (API routes for server operations)
                ↓
        AI Provider (mock or OpenAI)
```

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

# If using Hugging Face
HUGGINGFACE_MODEL=QWEN_MODEL
HUGGINGFACE_API_KEY=
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

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup
1. Fork the repository and clone locally
2. Install dependencies: `npm install`
3. Set up environment variables (see Local Setup section)
4. Run database migrations in Supabase
5. Start development server: `npm run dev`

### Branch Naming
- `feature/<feature-name>` - New features
- `bugfix/<issue-description>` - Bug fixes  
- `docs/<description>` - Documentation updates
- `chore/<description>` - Maintenance tasks

### Commit Messages
Use conventional commit format:
```
<type>: <description>

Examples:
feat: add voice viva practice module
fix: resolve profile saving issue
docs: update API documentation
```

### Pull Request Process
1. Create feature branch from `main`
2. Ensure all tests pass: `npm run lint && npm run typecheck && npm run build`
3. Run E2E tests: `npx cypress run` (if applicable)
4. Create PR with clear description and screenshots for UI changes
5. Address review feedback and merge

### Code Style
- Follow existing TypeScript and React patterns
- Use ESLint for linting (configured in project)
- Maintain consistent component structure
- Add TypeScript types for new features
- Include JSDoc comments for complex functions

### Testing
- Unit tests: Add to relevant component/service files
- E2E tests: Add to `cypress/e2e/` for critical user flows
- Test both mock and OpenAI provider modes

### Feature Development
1. Check existing issues or create new one for tracking
2. Design changes following the Feature Module Pattern
3. Implement service layer first, then components
4. Add appropriate TypeScript types
5. Update documentation if needed

## Default Routes

- Public: `/`, `/jobs`, `/u/[username]`, `/sign-in`, `/sign-up`
- Dashboard: `/dashboard`, `/dashboard/profile`, `/dashboard/portfolio`, `/dashboard/jobs`, `/dashboard/ai`, `/dashboard/tasks`, `/dashboard/notifications`, `/dashboard/admin`
