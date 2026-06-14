"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { captureClientEvent } from "@/lib/posthog";
import { loadCurrentProfile, loadEventBySlug } from "@/lib/supabase/domain";

export function AnonymousAuth({ eventSlug }: { eventSlug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "ready" | "redirecting" | "demo" | "error">("idle");

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

      try {
        let {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();

          if (error) {
            throw error;
          }

          user = data.user;
          await captureClientEvent("anonymous_player_signed_in", { eventSlug });
        }

        const event = await loadEventBySlug(supabase, eventSlug);

        if (!event || !user) {
          if (active) {
            setStatus("ready");
          }
          return;
        }

        const profile = await loadCurrentProfile(supabase, event.id, user);

        if (!profile) {
          if (active) {
            setStatus("redirecting");
          }
          router.replace(`/e/${eventSlug}/onboard`);
          return;
        }

        if (active) {
          setStatus("ready");
          router.refresh();
        }
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    }

    void ensureSession();

    return () => {
      active = false;
    };
  }, [eventSlug, router]);

  return <span className="sr-only">Auth status: {status}</span>;
}
