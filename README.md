# Formation

Formation is the live transfer market for hackathon teams. Participants scan a QR code, create a player card, pitch ideas as clubs, and use a scout recommendation engine to find balanced teammates.

The starter is optimized for a working hackathon demo. It runs with local sample data immediately, then uses Supabase, Resend, PostHog, Stripe, and NVIDIA Nemotron as you add keys.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase auth, database, and RLS
- Supabase anonymous auth for QR onboarding
- Resend team intro email route
- PostHog client/server event helpers
- Stripe Checkout test mode route
- Deterministic scout scoring when `NVIDIA_API_KEY` is missing

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

Client-exposed values start with `NEXT_PUBLIC_`. Server-only secrets must not use that prefix.

## Supabase Setup

1. Create a Supabase project.
2. Enable anonymous sign-ins in Supabase Auth.
3. Add the Supabase URL and anon key to `.env.local`.
4. Add the service role key only for server-side routes that need elevated access.
5. Apply the SQL migration in `supabase/migrations/001_initial_schema.sql`.

Using the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Using the dashboard:

1. Open SQL Editor.
2. Paste `supabase/migrations/001_initial_schema.sql`.
3. Run it.

The migration creates the schema, enables RLS on every table, adds demo-friendly policies, and seeds the sample event `world-cup-hack`.

## Demo Flow

1. Visit `/`.
2. Open `/e/world-cup-hack`.
3. Confirm the event page signs in anonymously when Supabase is configured.
4. Create a player card at `/e/world-cup-hack/onboard`.
5. View players, clubs, and teams at `/e/world-cup-hack/board`.
6. Open a team page from the board.
7. Try the scout recommendations and team intro email stub.
8. Open `/e/world-cup-hack/admin`.
9. Test organizer premium Checkout. Missing Stripe keys return a demo success URL.

## Important Routes

- `/` landing page
- `/e/[slug]` event QR destination
- `/e/[slug]/onboard` create or edit player card
- `/e/[slug]/board` live transfer board
- `/e/[slug]/teams/[teamId]` team page
- `/e/[slug]/admin` organizer dashboard
- `/checkout/success` Stripe success page

## API Routes

- `POST /api/profile/extract`
- `POST /api/scout/recommendations`
- `POST /api/email/team-formed`
- `POST /api/stripe/checkout`
- `POST /api/stripe/webhook`

Each route works as a guarded stub and includes clear TODOs for production behavior.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Definition Of Done

- [x] Next.js App Router project created with TypeScript and Tailwind.
- [x] Dark, sporty, premium Formation UI.
- [x] Landing page and required event routes added.
- [x] Supabase browser and server helpers added.
- [x] Anonymous auth bootstrap added for event QR destination.
- [x] API route stubs added with demo-safe fallbacks.
- [x] Deterministic scout scoring works without NVIDIA Nemotron.
- [x] Resend and Stripe routes are guarded by env vars.
- [x] Supabase migration includes schema, RLS, and seed data.
- [x] `.env.example` documents required environment variables.
- [ ] Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` in the target environment.

## Notes

- LinkedIn auth is not required.
- LinkedIn is never scraped.
- LinkedIn URL is only a player profile link field.
- Resume/profile extraction is intentionally a deterministic stub until NVIDIA Nemotron extraction is added.
- The app renders demo data when Supabase is not configured.
