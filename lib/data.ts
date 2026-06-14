import { getDemoBoard } from "@/lib/demo-data";
import { loadEventBoardFromSupabase } from "@/lib/supabase/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventBoard, TeamRoster } from "@/lib/types";

export async function getEventBoard(slug: string): Promise<EventBoard | null> {
  const demoBoard = getDemoBoard(slug);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return demoBoard;
  }

  try {
    return await loadEventBoardFromSupabase(supabase, slug, { includeJoinRequests: true });
  } catch {
    return null;
  }
}

export function getBoardStats(board: EventBoard) {
  const openTeams = board.teams.filter((team) => team.status === "forming").length;
  const openPositions = board.teams.reduce((total, team) => total + team.roles_needed.length, 0);
  const looking = board.profiles.filter((profile) => profile.looking_for_team).length;

  return {
    players: board.profiles.length,
    clubs: board.teams.length,
    ideas: board.ideas.length,
    openTeams,
    openPositions,
    looking,
  };
}

export function getTeamRoster(board: EventBoard, teamId: string): TeamRoster | null {
  const team = board.teams.find((item) => item.id === teamId);

  if (!team) {
    return null;
  }

  const idea = team.idea_id ? board.ideas.find((item) => item.id === team.idea_id) ?? null : null;
  const owner = board.profiles.find((profile) => profile.id === team.owner_profile_id) ?? null;
  const members = board.team_members
    .filter((membership) => membership.team_id === team.id)
    .map((membership) => {
      const profile = board.profiles.find((item) => item.id === membership.profile_id);
      return profile ? { membership, profile } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    team,
    idea,
    owner,
    members,
  };
}

export function profileById(board: EventBoard, profileId: string) {
  return board.profiles.find((profile) => profile.id === profileId) ?? null;
}

export function ideaById(board: EventBoard, ideaId: string | null) {
  if (!ideaId) {
    return null;
  }

  return board.ideas.find((idea) => idea.id === ideaId) ?? null;
}
