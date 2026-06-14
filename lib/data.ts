import { getDemoBoard } from "@/lib/demo-data";
import { loadEventBoardFromSupabase } from "@/lib/supabase/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventBoard, EventRecord, TeamRoster } from "@/lib/types";

export function toClientBoard(board: EventBoard): EventBoard {
  return {
    event: { ...board.event, organizer_email: null },
    profiles: board.profiles.map((profile) => ({ ...profile, email: null, user_id: null })),
    ideas: board.ideas,
    teams: board.teams,
    team_members: board.team_members,
    join_requests: board.join_requests.map((request) => ({ ...request, message: null })),
    source: board.source,
  };
}

export function isSyntheticEvent(event: EventRecord) {
  return event.id === "00000000-0000-4000-8000-000000000000";
}

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

export async function resolveEventSlug(eventId: string): Promise<string | null> {
  const demoBoard = getDemoBoard("world-cup-hack");

  if (demoBoard?.event.id === eventId) {
    return demoBoard.event.slug;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data } = await supabase.from("events").select("slug").eq("id", eventId).maybeSingle();
    return (data as { slug?: string } | null)?.slug ?? null;
  } catch {
    return null;
  }
}

export async function getEventBoardByEventId(eventId: string): Promise<EventBoard | null> {
  const slug = await resolveEventSlug(eventId);
  return slug ? getEventBoard(slug) : null;
}

export function countFormedTeams(board: EventBoard) {
  return board.teams.filter(
    (team) =>
      team.status === "formed" ||
      board.team_members.filter((member) => member.team_id === team.id).length >= 2,
  ).length;
}

export function getFormationFunnel(board: EventBoard) {
  return {
    visited: board.profiles.length,
    profiles: board.profiles.length,
    ideas: board.ideas.length,
    joinRequests: board.join_requests.length,
    teamsFormed: countFormedTeams(board),
  };
}

export function isEventPremium(event: EventRecord, now: Date = new Date()) {
  return Boolean(event.premium_until && new Date(event.premium_until).getTime() > now.getTime());
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
