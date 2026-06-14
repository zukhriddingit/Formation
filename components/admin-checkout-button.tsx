"use client";

import { CheckCircle2, CreditCard, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";

export function AdminCheckoutButton({
  eventSlug,
  configured,
  isPremium = false,
}: {
  eventSlug: string;
  configured: boolean;
  isPremium?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setMessage(null);
    track(ANALYTICS_EVENTS.CHECKOUT_STARTED, { event_slug: eventSlug, amount_cents: 4900 });

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_slug: eventSlug }),
      });
      const payload = (await response.json()) as { url?: string; configured?: boolean; message?: string };

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      setMessage(payload.message ?? "Checkout is not available right now.");
    } catch {
      setMessage("Could not reach checkout. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isPremium) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-4 py-3 text-sm font-black text-pitch-100">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Pro dashboard active
      </span>
    );
  }

  if (!configured) {
    return (
      <div>
        <button
          type="button"
          disabled
          title="Add STRIPE_SECRET_KEY to .env.local to enable checkout"
          className="focus-ring inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black text-zinc-400 opacity-70"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Unlock Pro Dashboard — $49
        </button>
        <p className="mt-3 text-sm text-zinc-500">
          Demo mode: add <code className="rounded bg-white/[0.06] px-1 py-0.5 text-zinc-300">STRIPE_SECRET_KEY</code> to enable test checkout.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
        Unlock Pro Dashboard — $49
      </button>
      {message ? <p className="mt-3 text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
