"use client";

import { Lightbulb, Trophy, UserRoundSearch, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventBoard } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { IdeaCard } from "@/components/idea-card";
import { PlayerCard } from "@/components/player-card";
import { TeamCard } from "@/components/team-card";
import { cn } from "@/lib/utils";

type TabKey = "players" | "clubs" | "teams";

const tabs: Array<{ key: TabKey; label: string; icon: typeof UsersRound }> = [
  { key: "players", label: "Players", icon: UsersRound },
  { key: "clubs", label: "Clubs / ideas", icon: Lightbulb },
  { key: "teams", label: "Teams", icon: Trophy },
];

export function BoardTabs({ board }: { board: EventBoard }) {
  const [active, setActive] = useState<TabKey>("players");
  const teamMemberCounts = useMemo(() => {
    return new Map(
      board.teams.map((team) => [
        team.id,
        board.team_members.filter((member) => member.team_id === team.id).length,
      ]),
    );
  }, [board.team_members, board.teams]);

  return (
    <section>
      <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition",
                selected ? "bg-pitch-500 text-pitch-950" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "players" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {board.profiles.length > 0 ? (
            board.profiles.map((profile) => <PlayerCard key={profile.id} profile={profile} eventSlug={board.event.slug} />)
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={UserRoundSearch} title="No players on the board" description="The transfer window opens when the first participant creates a player card." />
            </div>
          )}
        </div>
      ) : null}

      {active === "clubs" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {board.ideas.length > 0 ? (
            board.ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} owner={board.profiles.find((profile) => profile.id === idea.owner_profile_id)} />
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={Lightbulb} title="No clubs recruiting yet" description="Ideas show up here when captains post what they want to build." />
            </div>
          )}
        </div>
      ) : null}

      {active === "teams" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {board.teams.length > 0 ? (
            board.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                idea={board.ideas.find((idea) => idea.id === team.idea_id)}
                memberCount={teamMemberCounts.get(team.id) ?? 0}
                eventSlug={board.event.slug}
              />
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={Trophy} title="No teams formed yet" description="Teams appear once players start signing with clubs." />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
