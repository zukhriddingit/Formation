import { ArrowLeft, Share2, Trophy, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerCard } from "@/components/player-card";
import { RoleBadge } from "@/components/role-badge";
import { ScoutPanel } from "@/components/scout-panel";
import { ShareButtons } from "@/components/share-buttons";
import { TeamActions } from "@/components/team-actions";
import { TeamShareCard } from "@/components/share-card";
import { VibeBadge } from "@/components/vibe-badge";
import { getEventBoard, getTeamRoster, toClientBoard } from "@/lib/data";
import { recommendProfilesForTeam } from "@/lib/scout/scoring";
import { teamShareText, teamShareUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}): Promise<Metadata> {
  const { slug, teamId } = await params;
  const board = await getEventBoard(slug);
  const roster = getTeamRoster(board, teamId);

  if (!roster) {
    return { title: "Team not found · Formation" };
  }

  const title = `${roster.team.name} · ${board.event.name} · Formation`;
  const description =
    roster.team.tagline ?? roster.idea?.one_liner ?? `${roster.team.name} is forming a squad on Formation.`;
  const url = teamShareUrl(slug, teamId);

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Formation", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  // Sanitized: the roster + recommendations are rendered through client-graph
  // components, so strip PII (email/user_id) before it can reach the payload.
  const board = toClientBoard(await getEventBoard(slug));
  const roster = getTeamRoster(board, teamId);

  if (!roster) {
    notFound();
  }

  const recommendations = recommendProfilesForTeam(board, teamId, 3);
  const openSlots = Math.max(roster.team.max_size - roster.members.length, 0);

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/e/${slug}/board`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Transfer board
        </Link>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Club page
              </p>
              <VibeBadge vibe={roster.team.vibe} />
            </div>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{roster.team.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
              {roster.team.tagline ?? roster.idea?.one_liner ?? "This club is forming its match-day roster."}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {roster.team.roles_needed.map((role) => (
                <RoleBadge key={role}>{role}</RoleBadge>
              ))}
            </div>
            <div className="mt-8">
              <TeamActions eventSlug={slug} teamId={teamId} />
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Roster sheet</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-zinc-950/60 p-4">
                <p className="text-3xl font-black text-white">{roster.members.length}</p>
                <p className="mt-1 text-sm text-zinc-400">signed</p>
              </div>
              <div className="rounded-md border border-white/10 bg-zinc-950/60 p-4">
                <p className="text-3xl font-black text-white">{openSlots}</p>
                <p className="mt-1 text-sm text-zinc-400">open</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Captain: <span className="font-semibold text-white">{roster.owner?.name ?? "Unassigned"}</span>
            </p>
          </aside>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-2xl font-black text-white">Signed players</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {roster.members.length > 0 ? (
                roster.members.map(({ profile }) => <PlayerCard key={profile.id} profile={profile} compact />)
              ) : (
                <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                  No players signed yet — the captain is still recruiting.
                </p>
              )}
            </div>

            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-trophy-400" aria-hidden="true" />
                <h2 className="text-2xl font-black text-white">Share this club</h2>
              </div>
              <TeamShareCard
                team={roster.team}
                idea={roster.idea}
                memberCount={roster.members.length}
                eventName={board.event.name}
              />
              <div className="mt-4">
                <ShareButtons
                  eventSlug={slug}
                  url={teamShareUrl(slug, teamId)}
                  shareText={teamShareText(roster.team)}
                  kind="team"
                />
              </div>
            </div>
          </div>

          <ScoutPanel
            eventSlug={slug}
            mode="players_for_team"
            recommendations={recommendations}
            isTeamOwner
            title="Scout picks"
            subtitle={`Free agents who fit ${roster.team.name}`}
          />
        </section>
      </div>
    </main>
  );
}
