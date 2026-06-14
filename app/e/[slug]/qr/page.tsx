import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { EventNotFound } from "@/components/event-not-found";
import { QrCode } from "@/components/qr-code";
import { getEventBoard } from "@/lib/data";
import { appUrl, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicQrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);

  if (!board) {
    return <EventNotFound slug={slug} />;
  }

  const eventUrl = appUrl(`/e/${slug}`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link
        href={`/e/${slug}/admin`}
        className="focus-ring absolute left-6 top-6 inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Admin
      </Link>

      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-8 text-center shadow-glow">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-trophy-400">Scan to join</p>
        <h1 className="mt-3 text-3xl font-black text-white">{board.event.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{formatDateTime(board.event.starts_at)}</p>

        <div className="mt-7 flex justify-center">
          <QrCode value={eventUrl} size={300} className="overflow-hidden rounded-2xl border border-white/10 bg-white p-4" />
        </div>

        <p className="mt-6 break-all rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">{eventUrl}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <CopyButton value={eventUrl} />
          <Link
            href={`/e/${slug}/onboard`}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100"
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Create player card
          </Link>
        </div>
      </section>
    </main>
  );
}
