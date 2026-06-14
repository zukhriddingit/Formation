let initialized = false;

export async function captureClientEvent(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    return;
  }

  const { default: posthog } = await import("posthog-js");

  if (!initialized) {
    posthog.init(key, {
      api_host: "https://us.i.posthog.com",
      capture_pageview: false,
    });
    initialized = true;
  }

  posthog.capture(event, properties);
}

export function captureServerEvent(event: string, properties: Record<string, unknown> = {}) {
  const key = process.env.POSTHOG_KEY;

  if (!key) {
    return;
  }

  // TODO: Forward server events to PostHog's capture API when production analytics are enabled.
  console.info("[posthog]", event, properties);
}
