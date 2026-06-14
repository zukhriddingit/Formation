import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { EventBoard, EventRecord, Idea, JoinRequest, Profile, Team, TeamMember } from "@/lib/types";

export const publicProfileColumns =
  "id,event_id,name,linkedin_url,avatar_url,headline,bio,skills,positions,interests,wants_to_build,has_idea,looking_for_team,vibe,experience_level,created_at,updated_at";

export const ownProfileColumns =
  "id,event_id,user_id,name,email,linkedin_url,avatar_url,headline,bio,skills,positions,interests,wants_to_build,has_idea,looking_for_team,vibe,experience_level,created_at,updated_at";

export const eventColumns = "id,slug,name,location,starts_at,organizer_email,premium_until,created_at";
export const ideaColumns = "id,event_id,owner_profile_id,title,one_liner,target_user,roles_needed,tags,vibe,status,created_at,updated_at";
export const teamColumns = "id,event_id,owner_profile_id,idea_id,name,tagline,vibe,roles_needed,max_size,status,created_at,updated_at";
export const teamMemberColumns = "id,team_id,profile_id,role,created_at";
export const joinRequestColumns = "id,event_id,team_id,requester_profile_id,message,status,created_at,decided_at";

type FormationSupabase = SupabaseClient;

function withoutPrivateProfileFields(profile: Profile): Profile {
  return {
    ...profile,
    user_id: null,
    email: null,
  };
}

export async function loadEventBySlug(supabase: FormationSupabase, slug: string) {
  const { data, error } = await supabase.from("events").select(eventColumns).eq("slug", slug).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as EventRecord | null) ?? null;
}

export async function loadCurrentProfile(supabase: FormationSupabase, eventId: string, user: User | null) {
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(ownProfileColumns)
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Profile | null) ?? null;
}

export async function loadEventBoardFromSupabase(
  supabase: FormationSupabase,
  slug: string,
  options: { includeJoinRequests?: boolean } = {},
): Promise<EventBoard | null> {
  const event = await loadEventBySlug(supabase, slug);

  if (!event) {
    return null;
  }

  const [profilesResult, ideasResult, teamsResult, requestsResult] = await Promise.all([
    supabase.from("public_profiles").select(publicProfileColumns).eq("event_id", event.id).order("created_at", { ascending: true }),
    supabase.from("ideas").select(ideaColumns).eq("event_id", event.id).order("created_at", { ascending: true }),
    supabase.from("teams").select(teamColumns).eq("event_id", event.id).order("created_at", { ascending: true }),
    options.includeJoinRequests
      ? supabase.from("join_requests").select(joinRequestColumns).eq("event_id", event.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (ideasResult.error) {
    throw ideasResult.error;
  }

  if (teamsResult.error) {
    throw teamsResult.error;
  }

  if (requestsResult.error) {
    throw requestsResult.error;
  }

  const teams = (teamsResult.data ?? []) as Team[];
  const teamIds = teams.map((team) => team.id);
  let teamMembers: TeamMember[] = [];

  if (teamIds.length > 0) {
    const { data, error } = await supabase
      .from("team_members")
      .select(teamMemberColumns)
      .in("team_id", teamIds)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    teamMembers = (data ?? []) as TeamMember[];
  }

  return {
    event,
    profiles: ((profilesResult.data ?? []) as Profile[]).map(withoutPrivateProfileFields),
    ideas: (ideasResult.data ?? []) as Idea[],
    teams,
    team_members: teamMembers,
    join_requests: (requestsResult.data ?? []) as JoinRequest[],
    source: "supabase",
  };
}

export function getTeamMemberCount(board: EventBoard, teamId: string) {
  return board.team_members.filter((member) => member.team_id === teamId).length;
}

export function isTeamMember(board: EventBoard, teamId: string, profileId: string | null | undefined) {
  if (!profileId) {
    return false;
  }

  return board.team_members.some((member) => member.team_id === teamId && member.profile_id === profileId);
}

export function pendingRequestForTeam(board: EventBoard, teamId: string, profileId: string | null | undefined) {
  if (!profileId) {
    return null;
  }

  return (
    board.join_requests.find(
      (request) =>
        request.team_id === teamId &&
        request.requester_profile_id === profileId &&
        request.status === "pending",
    ) ?? null
  );
}
