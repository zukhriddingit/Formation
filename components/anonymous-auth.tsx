"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { captureClientEvent } from "@/lib/posthog";

export function AnonymousAuth({ eventSlug }: { eventSlug: string }) {
  const [status, setStatus] = useState<"idle" | "ready" | "demo">("idle");

  useEffect(() => {
    let active = true;

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
        await captureClientEvent("anonymous_player_signed_in", { eventSlug });
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
