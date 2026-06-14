# ScoutBoard Starter Repo Design

## Goal

Create a production-ish starter repository for ScoutBoard, a hackathon team formation app styled like a live soccer transfer market. The app should be demo-ready with `pnpm dev`, integrate with Supabase when configured, and stay useful with local sample data while environment variables are still being filled in.

## Scope

The starter includes a Next.js App Router application with TypeScript, Tailwind CSS, clean component primitives, Supabase auth/data helpers, demo-safe API route stubs, a Supabase migration, seed/demo data, and a README with setup and demo instructions.

The app will include:

- Landing page at `/`.
- Event QR destination at `/e/[slug]`.
- Player card onboarding at `/e/[slug]/onboard`.
- Live event board at `/e/[slug]/board`.
- Team detail page at `/e/[slug]/teams/[teamId]`.
- Organizer dashboard at `/e/[slug]/admin`.
- Checkout success page at `/checkout/success`.
- API stubs for profile extraction, scout recommendations, team-formed email, Stripe checkout, and Stripe webhook.

## Architecture

The repository will use a standard Next.js App Router structure:

- `app/` for pages, layouts, and route handlers.
- `components/` for reusable ScoutBoard UI pieces.
- `lib/` for Supabase clients, analytics, domain types, sample data, email templates, and scout scoring.
- `supabase/migrations/` for SQL schema and RLS policy setup.
- Root config files for TypeScript, Tailwind, ESLint, PostCSS, Next.js, and package scripts.

The route pages will be server components by default. Client-only behavior, such as anonymous Supabase sign-in and interactive tabs/forms, will live in small client components.

## Data Strategy

Supabase is the target backend. `lib/supabase/client.ts` creates the browser client, and `lib/supabase/server.ts` creates a cookie-aware server client. Both helpers tolerate missing environment variables so the starter can render in demo mode while setup is incomplete.

The app will include local sample data for the event slug `world-cup-hack`. Event pages first try Supabase when configured, then fall back to sample data if credentials are missing, queries fail, or no demo event exists yet.

## Authentication

On `/e/[slug]`, a small client bootstrap component checks the Supabase session and signs the user in anonymously when Supabase is configured and no user session exists. If Supabase env vars are missing, it quietly leaves the app in demo mode.

LinkedIn authentication and scraping are intentionally out of scope. LinkedIn is only a profile URL field.

## UI Design

The app will use a dark, sporty, premium visual direction with transfer-market language:

- Participants are "players".
- Ideas and teams are "clubs".
- Skills and roles are "positions".
- Matching is handled by the "scout".
- Team formation is the "transfer window".

Reusable UI components will include player, team, and idea cards; role and vibe badges; QR event card; stat card; and empty state. Pages should feel like a demo product, not raw CRUD.

## API Behavior

All requested API routes will return working JSON responses with clear TODOs:

- `/api/profile/extract` returns a parsed draft profile from pasted text and includes TODOs for resume parsing and OpenAI extraction.
- `/api/scout/recommendations` returns deterministic teammate/team recommendations using `lib/scout/scoring.ts`.
- `/api/email/team-formed` builds a Resend-ready payload and returns a demo response when `RESEND_API_KEY` is absent.
- `/api/stripe/checkout` returns a Stripe Checkout session URL when configured and a demo-safe fallback when missing Stripe keys.
- `/api/stripe/webhook` accepts events and includes TODOs for marking organizer premium access.

The app must work without `OPENAI_API_KEY` by using deterministic matching helpers.

## Database

`supabase/migrations/001_initial_schema.sql` will create the requested tables:

- `events`
- `profiles`
- `ideas`
- `teams`
- `team_members`
- `join_requests`
- `payments`
- `email_logs`

The migration will enable RLS on every table and define simple policies for public board reads, own-profile writes, owner-managed ideas/teams, join request visibility and updates, and team member insertion by team owners. It will also include seed SQL for `world-cup-hack`.

## Testing And Verification

The repo will include scripts for:

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

After implementation, run available checks and fix issues. If dependency installation or network access prevents checks from running, document that clearly in the final response.

## Out Of Scope

The starter will not implement full production billing, full organizer role management, LinkedIn auth, LinkedIn scraping, full resume parsing, or production email sending beyond a guarded Resend integration stub.
