import { createEmptyBoard, demoEvent, EMPTY_EVENT_ID, getDemoBoard } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventBoard, EventRecord, Idea, JoinRequest, Profile, Team, TeamMember, TeamRoster } from "@/lib/types";

/** True when the board is the synthetic fallback returned for an unknown slug. */
export function isSyntheticEvent(event: EventRecord) {
  return event.id === EMPTY_EVENT_ID;
}

/**
 * Strip server-only PII before handing a board to a "use client" component.
 * Next.js serializes all client-component props into the HTML/RSC payload, so
 * email, user_id, organizer_email, and free-text join-request messages must not
 * cross that boundary. Bio / linkedin_url are kept — the cards render them.
 */
export function toClientBoard(board: EventBoard): EventBoard {
  return {
    event: { ...board.event, organizer_email: null },
    profiles: board.profiles.map((profile) => ({ ...profile, email: null, user_id: null })),
    ideas: board.ideas,
    teams: board.teams,
    team_members: board.team_members,
    join_requests: board.join_requests.map((request) => ({ ...request, message: null })),
  };
}

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

/** Resolve an event id to its slug (demo mapping first, then Supabase). */
export async function resolveEventSlug(eventId: string): Promise<string | null> {
  if (eventId === demoEvent.id) {
    return demoEvent.slug;
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

/** Load a board by event id (the scout API accepts event_id per its contract). */
export async function getEventBoardByEventId(eventId: string): Promise<EventBoard | null> {
  const slug = await resolveEventSlug(eventId);
  return slug ? getEventBoard(slug) : null;
}

/** Count teams that have grown past a solo founder — a reasonable "formed" signal. */
export function countFormedTeams(board: EventBoard) {
  return board.teams.filter(
    (team) => board.team_members.filter((member) => member.team_id === team.id).length >= 2,
  ).length;
}

/**
 * Formation funnel for the organizer dashboard, derived from board data. The
 * "visited" stage is a lower bound (one player card per visitor who converted);
 * the live top-of-funnel number lives in PostHog (`event_page_viewed`).
 */
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
