import { ArrowLeft, ChartNoAxesCombined, Clock3, ListChecks, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { EventNotFound } from "@/components/event-not-found";
import { QrEventCard } from "@/components/qr-event-card";
import { RoleBadge } from "@/components/role-badge";
import { StatCard } from "@/components/stat-card";
import { getBoardStats, getEventBoard } from "@/lib/data";
import { getTeamMemberCount } from "@/lib/supabase/domain";

export const dynamic = "force-dynamic";

export default async function AdminPage({
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
  const teamsFormed = board.teams.filter((team) => team.status === "formed" || getTeamMemberCount(board, team.id) >= team.max_size).length;
  const teamsForming = board.teams.length - teamsFormed;
  const commonSkills = Array.from(
    board.profiles
      .flatMap((profile) => profile.skills)
      .reduce((counts, skill) => counts.set(skill, (counts.get(skill) ?? 0) + 1), new Map<string, number>()),
  )
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8);
  const recentRequests = board.join_requests.slice(0, 6);
  const teamsMissingRoles = board.teams.filter((team) => team.status !== "formed" && team.roles_needed.length > 0);

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/e/${slug}`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event desk
        </Link>

        <header className="grid gap-6 py-10 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pitch-100">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Organizer dashboard
            </p>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{board.event.name} command center</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
              Monitor the transfer window, spot unbalanced teams, and keep clubs moving toward full rosters.
            </p>
          </div>
          <QrEventCard event={board.event} />
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Players" value={stats.players} detail={`${stats.looking} still available`} icon={UsersRound} />
          <StatCard label="Teams forming" value={teamsForming} detail={`${teamsFormed} teams formed`} icon={Trophy} />
          <StatCard label="Looking" value={stats.looking} detail="Players still searching" icon={ShieldCheck} />
          <StatCard label="Open positions" value={stats.openPositions} detail="Recruiting gaps to close" icon={ChartNoAxesCombined} />
        </section>

        <section className="grid gap-6 py-12 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Roster balance</h2>
            </div>
            <div className="mt-5 space-y-3">
              {board.teams.map((team) => {
                const memberCount = board.team_members.filter((member) => member.team_id === team.id).length;
                const fillRate = Math.round((memberCount / team.max_size) * 100);
                return (
                  <div key={team.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold text-white">{team.name}</p>
                      <span className="text-sm text-zinc-400">{fillRate}% full</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                      <div className="h-2 rounded-full bg-pitch-500" style={{ width: `${fillRate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-trophy-400" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Most common skills</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {commonSkills.length > 0 ? (
                commonSkills.map(([skill, count]) => (
                  <span key={skill} className="rounded-md border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm font-semibold text-zinc-200">
                    {skill} <span className="text-zinc-500">x{count}</span>
                  </span>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No player skills posted yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-14 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Recent join requests</h2>
            </div>
            <div className="mt-5 space-y-3">
              {recentRequests.length > 0 ? (
                recentRequests.map((request) => {
                  const player = board.profiles.find((profile) => profile.id === request.requester_profile_id);
                  const team = board.teams.find((item) => item.id === request.team_id);
                  return (
                    <div key={request.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold text-white">{player?.name ?? "Unknown player"}</p>
                        <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold text-zinc-300">{request.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">Requested {team?.name ?? "unknown team"}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-zinc-400">No visible join requests yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-trophy-400" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Teams missing roles</h2>
            </div>
            <div className="mt-5 space-y-3">
              {teamsMissingRoles.length > 0 ? (
                teamsMissingRoles.map((team) => (
                  <div key={team.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{team.name}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {getTeamMemberCount(board, team.id)}/{team.max_size} signed
                        </p>
                      </div>
                      <Link href={`/e/${slug}/teams/${team.id}`} className="focus-ring rounded-md bg-pitch-500 px-3 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100">
                        Open
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {team.roles_needed.map((role) => (
                        <RoleBadge key={role}>{role}</RoleBadge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400">No open role gaps right now.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
