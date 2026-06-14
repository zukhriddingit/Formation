import { createEmptyBoard, getDemoBoard } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventBoard, EventRecord, Idea, JoinRequest, Profile, Team, TeamMember, TeamRoster } from "@/lib/types";

export async function getEventBoard(slug: string): Promise<EventBoard> {
  const fallback = getDemoBoard(slug) ?? createEmptyBoard(slug);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  try {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (eventError || !event) {
      return fallback;
    }

    const eventRecord = event as EventRecord;

    const [profilesResult, ideasResult, teamsResult, membersResult, requestsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("event_id", eventRecord.id).order("created_at", { ascending: true }),
      supabase.from("ideas").select("*").eq("event_id", eventRecord.id).order("created_at", { ascending: true }),
      supabase.from("teams").select("*").eq("event_id", eventRecord.id).order("created_at", { ascending: true }),
      supabase.from("team_members").select("*").order("created_at", { ascending: true }),
      supabase.from("join_requests").select("*").eq("event_id", eventRecord.id).order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error || ideasResult.error || teamsResult.error || membersResult.error) {
      return fallback;
    }

    const teams = (teamsResult.data ?? []) as Team[];
    const teamIds = new Set(teams.map((team) => team.id));
    const teamMembers = ((membersResult.data ?? []) as TeamMember[]).filter((member) => teamIds.has(member.team_id));

    return {
      event: eventRecord,
      profiles: (profilesResult.data ?? []) as Profile[],
      ideas: (ideasResult.data ?? []) as Idea[],
      teams,
      team_members: teamMembers,
      join_requests: requestsResult.error ? [] : ((requestsResult.data ?? []) as JoinRequest[]),
    };
  } catch {
    return fallback;
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
