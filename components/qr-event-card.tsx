import { CalendarClock, MapPin, ScanLine } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { QrCode } from "@/components/qr-code";
import type { EventRecord } from "@/lib/types";
import { appUrl, formatDateTime } from "@/lib/utils";

export async function QrEventCard({ event }: { event: EventRecord }) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  const requestOrigin = host ? `${protocol}://${host}` : undefined;
  const eventUrl = appUrl(`/e/${event.slug}`, requestOrigin);

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

      <div className="mt-5 grid gap-4 sm:grid-cols-[164px_1fr]">
        <QrCode value={eventUrl} size={144} className="overflow-hidden rounded-md border border-white/10 bg-white p-2" />
        <div className="min-w-0">
          <p className="break-all rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">{eventUrl}</p>
          <div className="mt-3">
            <CopyButton value={eventUrl} className="px-2.5 py-1.5 text-xs" />
          </div>
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
