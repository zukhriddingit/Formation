import { ArrowRight, Lightbulb, Radio, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { AnonymousAuth } from "@/components/anonymous-auth";
import { PlayerCard } from "@/components/player-card";
import { QrEventCard } from "@/components/qr-event-card";
import { StatCard } from "@/components/stat-card";
import { TeamCard } from "@/components/team-card";
import { getBoardStats, getEventBoard, toClientBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = toClientBoard(await getEventBoard(slug));
  const stats = getBoardStats(board);
  const featuredTeam = board.teams[0] ?? null;
  const featuredIdea = featuredTeam ? board.ideas.find((idea) => idea.id === featuredTeam.idea_id) : null;
  const memberCount = featuredTeam ? board.team_members.filter((member) => member.team_id === featuredTeam.id).length : 0;

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <AnonymousAuth eventSlug={slug} />
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="focus-ring rounded-md text-xl font-black text-white">
            Formation
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href={`/e/${slug}/board`} className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.1]">
              Board
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={`/e/${slug}/onboard`} className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100">
              Create card
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 py-14 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
              <Radio className="h-4 w-4" aria-hidden="true" />
              Transfer window open
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] text-white sm:text-7xl">{board.event.name}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Scan in, make your player card, and find the club that needs your positions before kickoff.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/e/${slug}/onboard`} className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-5 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100">
                Join transfer market
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={`/e/${slug}/admin`} className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.1]">
                Organizer dashboard
                <Trophy className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <QrEventCard event={board.event} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Players" value={stats.players} detail={`${stats.looking} still looking for a club`} icon={UsersRound} />
          <StatCard label="Clubs" value={stats.clubs} detail={`${stats.openTeams} clubs are forming`} icon={Trophy} />
          <StatCard label="Ideas" value={stats.ideas} detail="Pitches recruiting positions" icon={Lightbulb} />
          <StatCard label="Open positions" value={stats.openPositions} detail="Roles clubs still need" icon={Radio} />
        </section>

        <section className="grid gap-6 py-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Featured club</p>
                <h2 className="mt-2 text-2xl font-black text-white">Recruiting now</h2>
              </div>
              <Link href={`/e/${slug}/board`} className="focus-ring rounded-md text-sm font-bold text-pitch-100 hover:text-white">
                Full board
              </Link>
            </div>
            {featuredTeam ? <TeamCard team={featuredTeam} idea={featuredIdea} memberCount={memberCount} eventSlug={slug} /> : null}
          </div>
          <div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Scout watchlist</p>
              <h2 className="mt-2 text-2xl font-black text-white">New free agents</h2>
            </div>
            <div className="grid gap-4">
              {board.profiles.slice(0, 2).map((profile) => (
                <PlayerCard key={profile.id} profile={profile} compact />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
