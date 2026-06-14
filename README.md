# Formation

Formation is the live transfer market for hackathon team formation. Participants scan a QR code, get an anonymous Supabase session, create a player card, pitch ideas as clubs, form teams, and manage transfer requests from the board.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase auth, database, and RLS
- Supabase anonymous auth for QR onboarding
- Deterministic scout scoring, with NVIDIA Nemotron env hooks ready
- Guarded stubs for Resend, Stripe, and PostHog integration work

## Quick Start

Install dependencies:

```bash
pnpm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Run the dev server:

```bash
pnpm dev
```

Open the demo event:

```txt
http://localhost:3000/e/world-cup-hack
```

If `pnpm` is not installed, the repo can still be checked with the local binaries after dependencies are installed:

```bash
./node_modules/.bin/eslint . --max-warnings=0
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

## Environment Variables

Local secrets belong in `.env.local`. Keep `.env.example` committed and never commit `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=

POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000

NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
```

Client-exposed values start with `NEXT_PUBLIC_`. Server-only secrets must not use that prefix. The core profile, idea, team, and join-request flows use the Supabase anon key plus RLS, not the service role key.

## Supabase Setup

1. Create a Supabase project.
2. Enable anonymous sign-ins in Supabase Auth.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
4. Apply `supabase/migrations/001_initial_schema.sql`.

Using the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Using the dashboard:

1. Open SQL Editor.
2. Paste `supabase/migrations/001_initial_schema.sql`.
3. Run it.

The migration creates the schema, enables RLS on every table, adds the atomic `decide_join_request` RPC, and seeds:

- 1 event: `world-cup-hack`
- 8 sample players with `user_id = null` and no public email addresses
- 3 sample ideas
- 2 sample teams

Profile emails stay in `public.profiles`, which is only selectable by the owning authenticated user. Public board, team, and admin routes read safe player-card fields from `public.public_profiles`.

When Supabase is configured, Supabase is the source of truth. Local demo fallback data is only used when Supabase environment variables are missing, and demo writes are disabled.

## Completed Core Flow

- `/e/[slug]` loads the event by slug, shows an event-not-found page for unknown slugs, and runs client-side anonymous auth bootstrap.
- Anonymous users are routed into `/e/[slug]/onboard` when they do not have a profile for that event.
- `/e/[slug]/onboard` creates and edits the current user's player profile with name, email, LinkedIn URL, headline, bio, skills, positions, tags, build intent, idea/team flags, vibe, and experience level.
- `/e/[slug]/board` has Players, Clubs / Ideas, and Teams tabs with filters, create-idea, create-team, team-from-owned-idea, and request-to-join flows.
- Join requests prevent duplicate pending requests through a partial unique index and RLS-safe insert policy.
- `/e/[slug]/teams/[teamId]` shows the roster, owner state, pending requests for the team owner, and accept/reject controls.
- Accept/reject uses the Postgres RPC `decide_join_request` so updating the request and inserting the member happen atomically.
- Teams move to `formed` when accepted members fill `max_size`.
- `/e/[slug]/admin` shows a QR card, player/team/role stats, common skills, recent visible join requests, and teams missing roles.
- Public board, team, and admin queries read `public.public_profiles` and do not expose profile emails or auth user IDs.
- Resume extraction, Resend, Stripe, and PostHog remain as guarded hooks/stubs for separate branches.

## Demo Flow

1. Visit `/e/world-cup-hack`.
2. The browser signs in anonymously when Supabase is configured.
3. Create a player card at `/e/world-cup-hack/onboard`.
4. View and filter the board at `/e/world-cup-hack/board`.
5. Create an idea.
6. Create a team or create a team from an owned idea.
7. In another browser/session, create a different player card and request to join the team.
8. Return as the team owner and accept or reject the request on `/e/world-cup-hack/teams/[teamId]`.
9. Open `/e/world-cup-hack/admin` to see dashboard stats update.

## Important Routes

- `/` landing page
- `/e/[slug]` event QR destination
- `/e/[slug]/onboard` create or edit player card
- `/e/[slug]/board` live transfer board
- `/e/[slug]/teams/[teamId]` team page
- `/e/[slug]/admin` organizer dashboard
- `/checkout/success` existing Stripe success placeholder

## API Routes

- `POST /api/profile/extract`
- `POST /api/scout/recommendations`
- `POST /api/email/team-formed`
- `POST /api/stripe/checkout`
- `POST /api/stripe/webhook`

These routes remain guarded integration hooks. This branch does not implement resume extraction, Resend delivery, Stripe checkout ownership, or PostHog analytics beyond preserving existing call sites.

## Verification

Last verified in this branch with:

```bash
./node_modules/.bin/eslint . --max-warnings=0
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

## Remaining TODOs

- Add real organizer authorization for `/e/[slug]/admin`.
- Let the integrations branch complete resume extraction, Resend delivery, Stripe payments, and PostHog event design.
- Wire NVIDIA Nemotron into richer scout recommendations when the model API contract is finalized.
- Add end-to-end tests for two-browser join-request acceptance.
