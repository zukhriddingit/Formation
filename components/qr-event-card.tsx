import { CalendarClock, MapPin, ScanLine } from "lucide-react";
import Link from "next/link";
import type { EventRecord } from "@/lib/types";
import { appUrl, formatDateTime } from "@/lib/utils";

export function QrEventCard({ event }: { event: EventRecord }) {
  const eventUrl = appUrl(`/e/${event.slug}`);

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-trophy-400">QR destination</p>
          <h2 className="mt-2 text-xl font-black text-white">{event.name}</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.06] p-2 text-pitch-100">
          <ScanLine className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[120px_1fr] gap-4">
        <div className="grid aspect-square grid-cols-5 gap-1 rounded-md border border-white/10 bg-white p-2">
          {Array.from({ length: 25 }).map((_, index) => (
            <span
              key={index}
              className={
                [0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index)
                  ? "rounded-sm bg-ink-950"
                  : "rounded-sm bg-white"
              }
            />
          ))}
        </div>
        <div className="min-w-0">
          <p className="break-all rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">{eventUrl}</p>
          <div className="mt-4 space-y-2 text-sm text-zinc-400">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-trophy-400" aria-hidden="true" />
              {formatDateTime(event.starts_at)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pitch-500" aria-hidden="true" />
              {event.location ?? "Location TBA"}
            </p>
          </div>
        </div>
      </div>

      <Link
        href={`/e/${event.slug}/onboard`}
        className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100"
      >
        Create player card
      </Link>
    </div>
  );
}
