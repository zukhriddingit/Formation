# Formation

Formation is the live transfer market for hackathon team formation. Participants scan a real QR code, get an anonymous Supabase session, create a player card, pitch ideas as clubs, form teams, and manage transfer requests from the board.

The merged app includes the core team flow plus the teammate intelligence/growth layer: scout recommendations, profile extraction hooks, share pages, admin funnel polish, guarded Resend/Stripe/PostHog integrations, and NVIDIA Nemotron fallbacks.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase auth, database, anonymous sign-in, RLS, and atomic join-request RPC
- Deterministic scout scoring with optional NVIDIA Nemotron polish
- Resend, Stripe, and PostHog integration hooks with safe demo/no-op behavior
- Server-side QR SVG generation with `qrcode`

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/e/world-cup-hack`.

If `pnpm` is unavailable but dependencies are already installed, checks can run through local binaries:

```bash
./node_modules/.bin/eslint . --max-warnings=0
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

## Environment Variables

Put secrets in `.env.local` locally and in Vercel Project Settings for production. Client-exposed values must start with `NEXT_PUBLIC_`; server-only secrets must not.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000

NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1

RESEND_API_KEY=
RESEND_FROM="Formation <onboarding@resend.dev>"

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Supabase

1. Create a Supabase project.
2. Enable anonymous sign-ins in Auth.
3. Apply `supabase/migrations/001_initial_schema.sql`.
4. Add the Supabase public URL and anon key to Vercel.

The migration creates the schema, enables RLS, creates the `public_profiles` view so public pages do not expose profile emails, adds the atomic `decide_join_request` RPC, and seeds `world-cup-hack` with 8 players, 3 ideas, and 2 teams.

Normal profile, idea, team, board, and join-request flows use the Supabase anon key plus RLS. The service-role key is only for server-only integration hooks such as webhook/email logging.

## Main Routes

- `/e/[slug]` event desk and QR destination
- `/e/[slug]/onboard` create or edit the current user's player card
- `/e/[slug]/board` players, ideas, teams, filters, create flows, and join requests
- `/e/[slug]/teams/[teamId]` team page, roster, owner pending requests, accept/reject controls
- `/e/[slug]/p/[profileId]` public player share page
- `/e/[slug]/qr` public fullscreen QR page
- `/e/[slug]/admin` organizer dashboard and premium/integration panels
- `/checkout/success` Stripe checkout return page

## API Routes

- `POST /api/profile/extract`: parses pasted text or multipart resume uploads into an editable draft; LinkedIn URLs are never scraped.
- `POST /api/scout/recommendations`: returns deterministic profile/team recommendations, optionally polished by Nemotron.
- `POST /api/email/team-formed`: sends or logs team intro emails through Resend.
- `POST /api/stripe/checkout`: creates a test-mode organizer checkout session when Stripe is configured.
- `POST /api/stripe/webhook`: marks paid sessions and unlocks event premium status.

## Demo Test Flow

1. Visit `/e/world-cup-hack`.
2. Anonymous auth signs in and routes new users to onboarding.
3. Save a player card.
4. Create an idea and a team from the board.
5. In another browser/session, create a second player card and request to join.
6. Return as the team owner and accept or reject on the team page.
7. Confirm board and admin stats update.

## Verification

Run before shipping:

```bash
./node_modules/.bin/eslint . --max-warnings=0
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

## Remaining TODOs

- Add real organizer authorization for `/e/[slug]/admin`.
- Add end-to-end tests for the two-browser join-request acceptance flow.
- Configure production Resend, Stripe, PostHog, and NVIDIA credentials when those integrations are ready to demo.
