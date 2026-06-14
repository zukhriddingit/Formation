"use client";

import { useEffect, useRef } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics/events";

/**
 * Fires a single analytics event when mounted. Drop into a server-rendered page
 * to record a view (e.g. event_page_viewed). No-op when PostHog isn't set up.
 */
export function TrackView({
  event,
  properties = {},
}: {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;
    track(event, properties);
    // Fire exactly once on mount; props are a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
