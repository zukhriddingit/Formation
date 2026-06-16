import { CalendarPlus, SearchX } from "lucide-react";
import Link from "next/link";

export function EventNotFound({ slug }: { slug: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-lg border border-white/10 bg-zinc-950/75 p-8 text-center shadow-glow">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-trophy-400/30 bg-trophy-400/10 text-trophy-100">
          <SearchX className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Event not found</p>
        <h1 className="mt-3 text-4xl font-black text-white">No event board for `{slug}`</h1>
        <p className="mt-4 text-base leading-7 text-zinc-400">
          Check the QR code or event link. The demo event is available at World Cup Hack.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/organize"
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-5 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
          >
            Create event
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/e/world-cup-hack"
            className="focus-ring inline-flex rounded-md border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.1]"
          >
            Open demo event
          </Link>
        </div>
      </section>
    </main>
  );
}
