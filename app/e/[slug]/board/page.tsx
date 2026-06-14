import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { BoardTabs } from "@/components/board-tabs";
import { StatCard } from "@/components/stat-card";
import { getBoardStats, getEventBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);
  const stats = getBoardStats(board);

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/e/${slug}`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event desk
        </Link>
        <header className="py-10">
          <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
            <Radio className="h-4 w-4" aria-hidden="true" />
            Live board
          </p>
          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{board.event.name} transfer board</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
            Track free agents, clubs, and forming teams while the transfer window is open.
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard label="Players" value={stats.players} detail={`${stats.looking} free agents`} icon={Radio} />
          <StatCard label="Clubs" value={stats.clubs} detail={`${stats.openPositions} open positions`} icon={Radio} />
          <StatCard label="Ideas" value={stats.ideas} detail="Pitches on the market" icon={Radio} />
        </section>

        <BoardTabs board={board} />
      </div>
    </main>
  );
}
