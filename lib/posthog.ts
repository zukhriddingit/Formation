/**
 * PostHog transport. Both helpers are no-ops when PostHog isn't configured, so
 * the app never crashes in demo mode. Property values are sanitized before they
 * leave the process — see `sanitizeProps` — to guarantee we never ship resume
 * text, bios, email bodies, or other raw personal content to analytics.
 */

const SENSITIVE_KEYS = new Set([
  "bio",
  "text",
  "profiletext",
  "resume",
  "resume_text",
  "email",
  "email_body",
  "body",
  "html",
  "name",
  "headline",
  "raw",
  "content",
  "message",
]);

const MAX_STRING_LEN = 120;

/**
 * Drop sensitive keys and clamp free-form strings. We allow ids, slugs, counts,
 * booleans, short enums (mode, vibe), and arrays of short strings.
 */
export function sanitizeProps(properties: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof value === "string") {
      if (value.length <= MAX_STRING_LEN) {
        safe[key] = value;
      }
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      safe[key] = value.filter((item) => typeof item === "string" && item.length <= MAX_STRING_LEN).slice(0, 20);
      continue;
    }
    // Objects / other types are intentionally dropped.
  }

  return safe;
}

function posthogHost() {
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
}

let initialized = false;

export async function captureClientEvent(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    return;
  }

  try {
    const { default: posthog } = await import("posthog-js");

    if (!initialized) {
      posthog.init(key, {
        api_host: posthogHost(),
        capture_pageview: false,
        autocapture: false,
      });
      initialized = true;
    }

    posthog.capture(event, sanitizeProps(properties));
  } catch {
    // Analytics must never break the app.
  }
}

export async function captureServerEvent(event: string, properties: Record<string, unknown> = {}) {
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    return;
  }

  // Bound the request so a slow/hung PostHog endpoint can never stall an API
  // route that awaits this capture.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(`${posthogHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        properties: { ...sanitizeProps(properties), $lib: "formation-server" },
        distinct_id: typeof properties.distinct_id === "string" ? properties.distinct_id : "server",
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
  } catch {
    // Best-effort only.
  } finally {
    clearTimeout(timeout);
  }
}
