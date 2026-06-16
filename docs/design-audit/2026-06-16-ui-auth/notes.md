# Formation UI/Auth Audit - 2026-06-16

## Scope

- Product: Formation live hackathon team formation app.
- Live URL inspected: `https://formation-mu-beryl.vercel.app/`
- Primary flows inspected: home, event entry, onboarding, board, organizer/admin surfaces, profile/resume draft area.
- Source inspected: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `components/anonymous-auth.tsx`, `components/onboarding-form.tsx`, `components/board-tabs.tsx`, `components/organize-event-form.tsx`, and shared cards/badges.

## Capture Notes

- In-app Browser screenshot capture failed with a CDP `Page.captureScreenshot` timeout.
- Chrome extension automation was unavailable in this session.
- Computer Use could read the live Formation DOM/accessibility tree, but its screenshot surface intermittently rendered blank for Formation tabs.
- Findings below are grounded in the live accessibility tree, user-provided screenshots from this thread, and source inspection.

## Findings

1. Formation currently reads as a polished prototype/game surface, not a professional organizer product.
   - Evidence: homepage and app pages use "transfer market", "club", "scout", "pitch" language heavily; `tailwind.config.ts` names the primary green palette `pitch`, secondary amber `trophy`, and dark surfaces `ink`.
   - Recommendation: keep the soccer metaphor as light flavor, but move the visual system to neutral product language: organizer workspace, event board, player profile, teams, requests.

2. The green palette is systemic, not isolated.
   - Evidence: `app/globals.css` hard-codes green gradients and `focus-ring` uses `pitch-500`; cards, buttons, tabs, avatars, progress bars, checkboxes, and notices use `pitch-*` classes throughout.
   - Recommendation: introduce semantic tokens and map primary actions to a calmer blue/indigo accent. Avoid replacing every instance manually without a token layer.

3. There is no real light mode path.
   - Evidence: `:root { color-scheme: dark; }`, `html` and `body` are hard-coded dark, and components use `text-white`, `bg-zinc-950`, `border-white/10`, `bg-white/[0.04]`.
   - Recommendation: add a theme provider, user-visible theme toggle, and semantic CSS variables for page, surface, border, text, muted text, accent, success, warning, and danger.

4. Auth is anonymous-first and invisible.
   - Evidence: `components/anonymous-auth.tsx`, `components/board-tabs.tsx`, `components/team-page-client.tsx`, and `components/organize-event-form.tsx` call `supabase.auth.signInAnonymously()` when needed. There is no dedicated email login screen or account menu.
   - Recommendation: add email/password sign up/sign in, forgot password hooks, account status/sign out, and preserve anonymous guest entry as a lower-friction fallback.

5. The event entry auto-redirect can confuse demo users.
   - Evidence: `/e/[slug]` sends users without a profile to `/onboard`; the user already asked why it happens.
   - Recommendation: make that redirect feel intentional with a landing state or a clear "Create player profile / Sign in / Continue as guest" gate.

6. Visual density and typography need a product pass.
   - Evidence: large hero type, uppercase tracking, glowy cards, and dark translucent panels repeat across operational flows like onboarding, board, admin, and organizer creation.
   - Recommendation: keep strong hierarchy on the homepage, but use quieter dashboard typography, tighter spacing, and utility-first controls on board/admin/onboarding.

7. Accessibility risks are mostly color and focus related.
   - Evidence: forced dark mode, translucent borders, low-alpha panels, green/yellow focus and badges, and uppercase micro-labels.
   - Recommendation: verify contrast in both themes after implementation, preserve visible focus rings, and avoid relying on color alone for status.

## Proposed Build Brief

- Direction: Professional SaaS-style event workspace, not a stadium/game UI.
- Palette: neutral slate surfaces with blue/indigo primary accent, restrained amber only for important highlights.
- Theme: full light/dark mode with a persistent toggle and system-default initialization.
- Auth: dedicated email/password login and signup, account menu/sign out, and guest mode preserved for fast event entry.
- Scope: update shared theme foundation plus the highest-traffic screens first: home, organize, event entry, onboarding, board, team page, and admin.
