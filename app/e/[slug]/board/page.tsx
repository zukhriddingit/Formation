import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { BoardTabs } from "@/components/board-tabs";
import { EventNotFound } from "@/components/event-not-found";
import { ScoutPanel } from "@/components/scout-panel";
import { StatCard } from "@/components/stat-card";
import { getBoardStats, getEventBoard, toClientBoard } from "@/lib/data";
import { recommendProfilesForTeam } from "@/lib/scout/scoring";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);

  if (!board) {
    return <EventNotFound slug={slug} />;
  }

  const stats = getBoardStats(board);

  // Spotlight scout picks for the club with the most open roster slots.
  const featuredTeam = [...board.teams]
    .map((team) => ({
      team,
      openSlots: team.max_size - board.team_members.filter((member) => member.team_id === team.id).length,
    }))
    .sort((a, b) => b.openSlots - a.openSlots)[0]?.team;
  const scoutPicks = featuredTeam ? recommendProfilesForTeam(board, featuredTeam.id, 3) : [];

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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <BoardTabs board={toClientBoard(board)} />
          {featuredTeam ? (
            <ScoutPanel
              eventSlug={slug}
              mode="players_for_team"
              recommendations={scoutPicks}
              title="Scout recommends"
              subtitle={`Free agents for ${featuredTeam.name}`}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
