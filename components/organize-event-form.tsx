"use client";

import { ArrowRight, CalendarClock, ClipboardCheck, Loader2, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { normalizeEventSlug, slugifyEventName } from "@/lib/events";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CreatedEvent = {
  slug: string;
  name: string;
};

export function OrganizeEventForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [origin, setOrigin] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<CreatedEvent | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function updateName(value: string) {
    setName(value);
    if (!slugWasEdited) {
      setSlug(slugifyEventName(value));
    }
  }

  function updateSlug(value: string) {
    setSlugWasEdited(true);
    setSlug(normalizeEventSlug(value));
  }

  async function getAuthHeader() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    let {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const { data, error: signInError } = await supabase.auth.signInAnonymously();

      if (signInError || !data.session) {
        throw signInError ?? new Error("Could not start organizer session.");
      }

      session = data.session;
    }

    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedEvent(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          ...(await getAuthHeader()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          location,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          organizer_email: organizerEmail,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { event?: CreatedEvent; error?: string };

      if (!response.ok || !payload.event) {
        throw new Error(payload.error ?? "Could not create event.");
      }

      setCreatedEvent(payload.event);
      router.push(`/e/${payload.event.slug}/admin`);
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create event.");
    } finally {
      setIsCreating(false);
    }
  }

  const eventUrl = origin && slug ? `${origin}/e/${slug}` : "";

  return (
    <form onSubmit={createEvent} className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Organizer setup</p>
          <h2 className="mt-2 text-2xl font-black text-white">Create an event board</h2>
        </div>
        <div className="rounded-md border border-pitch-500/25 bg-pitch-500/10 p-2 text-pitch-100">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {error ? (
        <div className="mt-5 flex gap-3 rounded-md border border-boot-400/30 bg-boot-400/10 p-3 text-sm text-boot-400">
          <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {createdEvent ? (
        <div className="mt-5 flex gap-3 rounded-md border border-pitch-500/25 bg-pitch-500/10 p-3 text-sm text-pitch-100">
          <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{createdEvent.name} is ready. Opening the dashboard.</p>
        </div>
      ) : null}

      <fieldset disabled={isCreating} className="mt-5 grid gap-4 disabled:opacity-70 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-zinc-300">Event name</span>
          <input
            value={name}
            onChange={(inputEvent) => updateName(inputEvent.target.value)}
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
            placeholder="Boston AI Hack Night"
            required
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-zinc-300">Invite slug</span>
          <div className="mt-2 grid gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 md:grid-cols-[auto_1fr]">
            <span className="min-w-0 truncate text-sm text-zinc-500">/e/</span>
            <input
              value={slug}
              onChange={(inputEvent) => updateSlug(inputEvent.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
              placeholder="boston-ai-hack"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-300">Location</span>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <MapPin className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              value={location}
              onChange={(inputEvent) => setLocation(inputEvent.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
              placeholder="BU Spark"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-300">Start time</span>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <CalendarClock className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </div>
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-zinc-300">Organizer email</span>
          <input
            type="email"
            value={organizerEmail}
            onChange={(inputEvent) => setOrganizerEmail(inputEvent.target.value)}
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
            placeholder="organizer@example.com"
          />
        </label>
      </fieldset>

      {eventUrl ? (
        <div className="mt-5 rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Participant link</p>
          <p className="mt-2 break-all text-sm text-zinc-300">{eventUrl}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isCreating || !name.trim() || !slug.trim()}
        className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        Create event board
      </button>
    </form>
  );
}
