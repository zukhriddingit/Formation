# Core Team Flow Design

## Goal

Implement Formation's core hackathon team-formation flow end to end on the `core-team-flow` branch. Supabase is the source of truth when configured. Demo fallback is limited to read-only states and must not fake successful writes.

## Scope

This branch covers Supabase schema/RLS, anonymous auth, profile create/edit, idea creation, team creation, join requests, live board views, team pages, organizer dashboard basics, demo seed data, and README updates.

This branch does not implement resume extraction, Stripe, Resend, or PostHog beyond preserving existing hooks and stubs.

## Architecture

Use normal Supabase browser clients for authenticated anonymous-user flows. A client bootstrap component signs in anonymously and lets Supabase manage its normal browser session storage/cookies. Server components may read public event data, but they must not assume they can create a browser session.

Shared data access should live under `lib/` and keep event/profile/team joins typed. Mutations should execute as the current authenticated user so RLS enforces ownership. Service role must not be used for profiles, ideas, teams, board data, or join-request flows.

## Data Flow

- `/e/[slug]` loads the event and runs client auth bootstrap.
- After anonymous sign-in, the bootstrap checks whether the current user has a profile for the event.
- Users without a profile are routed to `/e/[slug]/onboard`.
- Users with a profile can use `/board`, create ideas and teams, request to join teams, and manage requests for teams they own.
- Unknown event slugs render a polished event-not-found page.

## Mutations

Profile, idea, team, and join-request creation use RLS-safe Supabase queries. Accepting or rejecting a join request should use an atomic Postgres RPC that verifies team ownership before updating the request and inserting a team member. The RPC should mark a team formed when the accepted member fills the roster.

## RLS

Enable RLS on all app tables. Authenticated anonymous users can read event board data. Users can manage only their own profile, ideas, teams, and join requests. Team owners can see and decide requests for their teams. Seeded demo profiles use `user_id = null` and remain read-only.

## UI

Keep the existing dark, premium transfer-market style. Make mobile layouts first-class for QR entry. Use badges, cards, forms, loading states, errors, and empty-state CTAs. Do not expose private emails on public cards or dashboards.

## Verification

Run lint, typecheck, and build. Smoke-test the core routes where practical. Update README with completed work, seed instructions, and remaining TODOs.
