import { ShieldCheck, Trophy } from "lucide-react";
import type { Idea, Team } from "@/lib/types";
import { RoleBadge } from "@/components/role-badge";
import { VibeBadge } from "@/components/vibe-badge";

/**
 * A polished, screenshot-ready "transfer card" for a team. Pure presentational —
 * looks like a soccer signing announcement, sized to share/screenshot cleanly.
 */
export function TeamShareCard({
  team,
  idea,
  memberCount,
  eventName,
}: {
  team: Team;
  idea?: Idea | null;
  memberCount: number;
  eventName: string;
}) {
  const openSlots = Math.max(team.max_size - memberCount, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-pitch-900/60 via-zinc-950 to-ink-950 p-6 shadow-glow">
      <div className="stadium-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Signed on Formation
          </span>
          <VibeBadge vibe={team.vibe} />
        </div>

        <h3 className="mt-6 text-3xl font-black leading-tight text-white">{team.name}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">
          {team.tagline ?? idea?.one_liner ?? "Forming a balanced squad for demo day."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {team.roles_needed.slice(0, 4).map((role) => (
            <RoleBadge key={role}>{role}</RoleBadge>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-pitch-500" aria-hidden="true" />
            <span className="font-bold text-white">{memberCount}</span> signed
            <span className="text-zinc-500">·</span>
            <span className="font-bold text-white">{openSlots}</span> open
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{eventName}</p>
        </div>
      </div>
    </div>
  );
}
