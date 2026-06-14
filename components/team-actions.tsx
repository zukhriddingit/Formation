"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";

export function TeamActions({
  eventSlug,
  teamId,
}: {
  eventSlug: string;
  teamId: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function sendIntro() {
    const response = await fetch("/api/email/team-formed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventSlug, teamId }),
    });
    const payload = (await response.json()) as { message?: string; mode?: string };
    setMessage(payload.message ?? (payload.mode === "demo" ? "Demo email payload generated." : "Intro email queued."));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        Request transfer
      </button>
      <button
        type="button"
        onClick={sendIntro}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.1]"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        Send intro email
      </button>
      {message ? <p className="basis-full text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
