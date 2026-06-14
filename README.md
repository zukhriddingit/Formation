# Formation

Formation is the live transfer market for hackathon teams. Participants scan a QR code, create a player card, pitch ideas as clubs, and use an AI scout to form balanced teams — like a soccer transfer window for hackathons.

The app is demo-ready out of the box: it runs on local sample data with **no keys at all**, then progressively lights up Supabase, NVIDIA Nemotron, Resend, Stripe, and PostHog as you add credentials.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase (auth, database, RLS, anonymous sign-in)
- NVIDIA Nemotron for resume extraction + recommendation polish (deterministic fallback)
- Resend for the team intro email
- Stripe Checkout (test mode) for organizer premium
- PostHog for the formation funnel
- `pdf-parse` / `mammoth` for resume file parsing

## Quick start

```bash
pnpm install
cp .env.example .env.local   # then paste any keys you have
pnpm dev
```

Open the demo event: `http://localhost:3000/e/world-cup-hack`

Everything works with an empty `.env.local` — each missing integration falls back to a safe demo mode.

---

## What's in the intelligence / growth / demo layer

### A. Resume / profile autofill — `POST /api/profile/extract`
Turn a resume or pasted text into a draft player card.

- Accepts **multipart** (`file`, `text`, `linkedinUrl`) or **JSON** (`{ text, linkedinUrl }`).
- Resume files: **PDF** (`pdf-parse`), **DOCX** (`mammoth`), and `.txt`/`.md`.
- **LinkedIn is never scraped or fetched** — the URL is stored as a link only. If you paste LinkedIn/profile *text*, that text is parsed.
- With `NVIDIA_API_KEY` set, Nemotron produces structured JSON; **without it**, deterministic heuristics run (email regex, keyword skill detection, skill→position inference, headline synthesis).
- **Raw resume text is never persisted** — the endpoint returns a draft only, and the participant edits + confirms before saving.
- Output shape:
  ```json
  { "name": null, "email": null, "headline": null, "bio": null,
    "skills": [], "positions": [], "interests": [],
    "experience_level": null, "linkedin_url": null,
    "confidence": 0.0, "notes": [] }
  ```
- UI lives on `/e/[slug]/onboard`: upload resume, paste text, LinkedIn field, **Autofill my card**, a draft preview with confidence + notes, and **Apply draft to form**. Privacy copy is shown inline.

### B. AI Scout — `POST /api/scout/recommendations`
Deterministic, explainable matchmaking that works **without any LLM**.

- Accepts `event_id` **or** `event_slug`, plus `team_id` or `profile_id`, and `mode`:
  - `players_for_team` — free agents for a club
  - `teams_for_player` — clubs for a player
  - `teammates_for_player` — complementary players for a player
- Scoring adds points for role fit, shared interests/tags, vibe compatibility, complementary skills, being a free agent, and open slots; it subtracts for already-signed players, full rosters, and clashing vibes.
- Each recommendation returns `score`, human `reasons`, `matched_skills`, `missing_role_fit`, and `vibe_match`.
- Optional: pass `{ "polish": true }` to have Nemotron reword the explanations (facts unchanged). Recommendations never depend on the LLM.

### C. Scout UI
A polished **Scout panel** (score meters, reason chips, matched-skill/gap chips, vibe badge, contextual CTAs) on the **board**, **team**, **player profile**, and **onboarding success** views.

### D. Team intro email — `POST /api/email/team-formed`
- Body: `{ team_id, event_slug? }`. Loads the team + accepted members.
- Subject: **"You're signed with [Team] on Formation"**, with the roster, team link, and a short kickoff nudge.
- Sends via Resend **server-side only**. Without `RESEND_API_KEY` it logs a fake success to the console (demo mode).
- Writes `email_logs` rows when the Supabase service role is available.
- Trigger it from the **Send intro email** button on any team page.

### E. Stripe checkout — `POST /api/stripe/checkout` + `POST /api/stripe/webhook`
- Product: **"Formation Pro — Event Dashboard"**, a $49 one-time payment (test mode).
- Success URL `/checkout/success?session_id={CHECKOUT_SESSION_ID}`; cancel URL is the event admin page.
- A pending `payments` row is stored on session creation; the webhook marks it paid and sets `events.premium_until` (one year).
- Without Stripe keys the **Unlock Pro Dashboard — $49** button is disabled with a setup hint.
- Premium features on `/e/[slug]/admin` (CSV export, sponsor branding, advanced matching report) unlock only when the event is premium.

### F. PostHog funnel
The full event taxonomy lives in `lib/analytics/events.ts`. **Wired in this layer:**
`event_page_viewed`, `anonymous_user_created`, `profile_autofill_started/completed`, `profile_created`, `scout_recommendation_viewed`, `join_request_sent`, `intro_email_sent`, `checkout_started`, `checkout_completed`, `share_card_clicked`.

`idea_created`, `team_created`, `join_request_accepted`, and `team_formed` are defined for the core CRUD / join-acceptance flow (owned separately) to emit — call `track(ANALYTICS_EVENTS.TEAM_CREATED, …)` from those handlers.

Events carry only **ids, slugs, counts, booleans, and short enums**. A sanitizer strips sensitive keys (bio, email, resume text, etc.) and over-long strings before anything leaves the process. No PostHog key = no-op (never crashes).

### G. Shareable cards
- Team page: a screenshot-ready **team share card** + **Share team card / Copy link / Copy share text** buttons.
- Player cards: **Copy profile link** (to a read-only profile page at `/e/[slug]/p/[profileId]`).
- Share text: *"I just signed with [Team] on Formation — forming hackathon teams like a transfer market."*
- Open Graph + Twitter metadata on team and profile pages.

### H. QR / admin polish (`/e/[slug]/admin`)
- A **real, scannable QR code** (SVG, generated server-side).
- Event URL with **copy link**, **open board**, and **open public QR view** (`/e/[slug]/qr`, a fullscreen scan page).
- A **formation funnel** (visited → profiles → join requests → teams formed) from live board counts.

### I. Demo mode
Missing any of these degrades gracefully: `NVIDIA_API_KEY` → deterministic extraction/scout; `RESEND_API_KEY` → fake email + console log; Stripe keys → disabled button with hint; PostHog → silent no-op; Supabase → in-memory demo data.

---

## Environment variables

Put secrets in `.env.local` (gitignored). Client-exposed values must start with `NEXT_PUBLIC_`; server-only secrets must not.

```bash
# Supabase (optional — demo data fallback)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (optional — fake success when missing)
RESEND_API_KEY=
RESEND_FROM="Formation <onboarding@resend.dev>"

# PostHog (optional — no-op when missing)
POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Stripe test mode (optional — button disabled when missing)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# App + NVIDIA Nemotron (optional — deterministic fallback)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
```

### NVIDIA Nemotron (resume extraction + scout polish)
1. Get an API key from [build.nvidia.com](https://build.nvidia.com/).
2. Set `NVIDIA_API_KEY`. `NVIDIA_BASE_URL` and `NVIDIA_MODEL` already point at the hosted, OpenAI-compatible endpoint.
3. The client uses plain `fetch` with a timeout and **always** falls back to heuristics on any error — the LLM is never on the critical path.

### Resume extraction
`pdf-parse` and `mammoth` are installed and used only server-side in `/api/profile/extract` (Node runtime; they're listed in `serverExternalPackages`). Image-only/scanned PDFs return a helpful "paste your text" message rather than failing.

### Resend
1. Create a Resend API key and (ideally) verify a sending domain.
2. Set `RESEND_API_KEY` and `RESEND_FROM` (defaults to Resend's shared `onboarding@resend.dev` sandbox).

### Stripe (test mode)
1. Use your Stripe **test** secret key for `STRIPE_SECRET_KEY`.
2. For local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Pay with test card `4242 4242 4242 4242`.

### PostHog
1. Create a project and copy the **Project API key**.
2. Set `NEXT_PUBLIC_POSTHOG_KEY` (client) and optionally `POSTHOG_KEY` (server). Adjust `NEXT_PUBLIC_POSTHOG_HOST` for EU.

### Supabase
1. Create a project; enable **anonymous sign-ins** in Auth.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by the webhook + email logging).
3. Apply `supabase/migrations/001_initial_schema.sql` (CLI `supabase db push`, or paste into the SQL editor). It creates the schema, RLS, demo-friendly policies, and seeds `world-cup-hack`.

---

## Routes

Pages: `/` · `/e/[slug]` · `/e/[slug]/onboard` · `/e/[slug]/board` · `/e/[slug]/teams/[teamId]` · `/e/[slug]/p/[profileId]` · `/e/[slug]/qr` · `/e/[slug]/admin` · `/checkout/success`

API: `POST /api/profile/extract` · `POST /api/scout/recommendations` · `POST /api/email/team-formed` · `POST /api/stripe/checkout` · `POST /api/stripe/webhook`

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Notes & constraints

- LinkedIn is never scraped or fetched — it's only a profile link field.
- Raw resume text is never stored; extraction returns an editable draft only.
- Service-role keys are used server-side only; nothing secret reaches the client.
- The core profile/team/join-request CRUD and RLS are owned separately and were not modified.
