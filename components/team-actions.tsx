"use client";

import { Check, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";

export function TeamActions({
  eventSlug,
  teamId,
}: {
  eventSlug: string;
  teamId: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);

  function requestTransfer() {
    track(ANALYTICS_EVENTS.JOIN_REQUEST_SENT, { event_slug: eventSlug, team_id: teamId, direction: "player_to_team" });
    setRequested(true);
    setMessage("Transfer request sent to the club captain.");
  }

  async function sendIntro() {
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/email/team-formed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_slug: eventSlug, team_id: teamId }),
      });
      const payload = (await response.json()) as { message?: string; mode?: string };
      setMessage(payload.message ?? (payload.mode === "demo" ? "Demo email generated." : "Intro email sent."));
    } catch {
      setMessage("Could not send the intro email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={requestTransfer}
        disabled={requested}
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:cursor-default disabled:opacity-80"
      >
        {requested ? <Check className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {requested ? "Transfer requested" : "Request transfer"}
      </button>
      <button
        type="button"
        onClick={sendIntro}
        disabled={sending}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
        Send intro email
      </button>
      {message ? <p className="basis-full text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
