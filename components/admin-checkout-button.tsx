"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

export function AdminCheckoutButton({ eventSlug }: { eventSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventSlug }),
      });
      const payload = (await response.json()) as { url?: string; mode?: string; message?: string };

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      setMessage(payload.message ?? "Checkout is not configured yet.");
    } finally {
      setLoading(false);
    }
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
        Upgrade organizer dashboard
      </button>
      {message ? <p className="mt-3 text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
