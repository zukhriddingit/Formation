"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";

export function AnonymousAuth({ eventSlug }: { eventSlug: string }) {
  const [status, setStatus] = useState<"idle" | "ready" | "demo">("idle");
  const viewed = useRef(false);

  useEffect(() => {
    let active = true;

    if (!viewed.current) {
      viewed.current = true;
      track(ANALYTICS_EVENTS.EVENT_PAGE_VIEWED, { event_slug: eventSlug });
    }

    async function ensureSession() {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        if (active) {
          setStatus("demo");
        }
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        await supabase.auth.signInAnonymously();
        track(ANALYTICS_EVENTS.ANONYMOUS_USER_CREATED, { event_slug: eventSlug });
      }

      if (active) {
        setStatus("ready");
      }
    }

    void ensureSession();

    return () => {
      active = false;
    };
  }, [eventSlug]);

  return <span className="sr-only">Auth status: {status}</span>;
}
