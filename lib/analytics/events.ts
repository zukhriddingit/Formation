/**
 * Formation funnel event taxonomy.
 *
 * Track only structural signal: event ids/slugs, counts, booleans, short enums.
 * Never pass resume text, bios, email bodies, or other raw personal data — the
 * transport additionally strips sensitive keys (see `sanitizeProps`).
 */
import { captureClientEvent } from "@/lib/posthog";

export const ANALYTICS_EVENTS = {
  EVENT_PAGE_VIEWED: "event_page_viewed",
  ANONYMOUS_USER_CREATED: "anonymous_user_created",
  PROFILE_AUTOFILL_STARTED: "profile_autofill_started",
  PROFILE_AUTOFILL_COMPLETED: "profile_autofill_completed",
  PROFILE_CREATED: "profile_created",
  IDEA_CREATED: "idea_created",
  TEAM_CREATED: "team_created",
  SCOUT_RECOMMENDATION_VIEWED: "scout_recommendation_viewed",
  JOIN_REQUEST_SENT: "join_request_sent",
  JOIN_REQUEST_ACCEPTED: "join_request_accepted",
  TEAM_FORMED: "team_formed",
  INTRO_EMAIL_SENT: "intro_email_sent",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  SHARE_CARD_CLICKED: "share_card_clicked",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Client-side fire-and-forget tracking. Safe to call anywhere; no-op without PostHog. */
export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  void captureClientEvent(event, properties);
}
