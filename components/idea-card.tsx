import { Lightbulb, Target } from "lucide-react";
import type { Idea, Profile } from "@/lib/types";
import { RoleBadge } from "@/components/role-badge";
import { VibeBadge } from "@/components/vibe-badge";

export function IdeaCard({
  idea,
  owner,
}: {
  idea: Idea;
  owner?: Profile | null;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-zinc-950/70 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-trophy-400/25 bg-trophy-400/10 p-2 text-trophy-100">
          <Lightbulb className="h-5 w-5" aria-hidden="true" />
        </div>
        <VibeBadge vibe={idea.vibe} />
      </div>
      <h3 className="mt-4 text-lg font-black text-white">{idea.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{idea.one_liner}</p>

      {idea.target_user ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400">
          <Target className="h-4 w-4 text-pitch-500" aria-hidden="true" />
          {idea.target_user}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {idea.roles_needed.map((role) => (
          <RoleBadge key={role}>{role}</RoleBadge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {idea.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Club owner: {owner?.name ?? "Unassigned"}
      </div>
    </article>
  );
}
