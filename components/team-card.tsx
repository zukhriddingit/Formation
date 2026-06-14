import { ArrowRight, UsersRound } from "lucide-react";
import Link from "next/link";
import type { Idea, Team } from "@/lib/types";
import { RoleBadge } from "@/components/role-badge";
import { VibeBadge } from "@/components/vibe-badge";

export function TeamCard({
  team,
  idea,
  memberCount,
  eventSlug,
}: {
  team: Team;
  idea?: Idea | null;
  memberCount: number;
  eventSlug: string;
}) {
  const openSlots = Math.max(team.max_size - memberCount, 0);

  return (
    <article className="rounded-lg border border-white/10 bg-zinc-950/70 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-pitch-500/25 bg-pitch-500/10 p-2 text-pitch-100">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <VibeBadge vibe={team.vibe} />
      </div>

      <h3 className="mt-4 text-lg font-black text-white">{team.name}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{team.tagline ?? idea?.one_liner ?? "Open club on the board."}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {team.roles_needed.length > 0 ? (
          team.roles_needed.map((role) => <RoleBadge key={role}>{role}</RoleBadge>)
        ) : (
          <span className="text-sm text-zinc-500">Roster needs not posted</span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Roster</p>
          <p className="mt-1 text-sm text-zinc-300">
            {memberCount}/{team.max_size} signed, {openSlots} open
          </p>
        </div>
        <Link
          href={`/e/${eventSlug}/teams/${team.id}`}
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-3 py-2 text-sm font-bold text-pitch-950 hover:bg-pitch-100"
        >
          View
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
