import { NextResponse } from "next/server";
import { getEventBoard, getEventBoardByEventId } from "@/lib/data";
import {
  recommendProfilesForTeam,
  recommendTeammatesForProfile,
  recommendTeamsForProfile,
} from "@/lib/scout/scoring";
import { polishRecommendations } from "@/lib/scout/polish";
import type { ScoutMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_MODES: ScoutMode[] = ["teammates_for_player", "players_for_team", "teams_for_player"];

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    event_id?: string;
    eventId?: string;
    event_slug?: string;
    eventSlug?: string;
    team_id?: string;
    teamId?: string;
    profile_id?: string;
    profileId?: string;
    mode?: ScoutMode;
    limit?: number;
    polish?: boolean;
  };

  const eventSlug = payload.event_slug ?? payload.eventSlug;
  const eventId = payload.event_id ?? payload.eventId;
  const teamId = payload.team_id ?? payload.teamId;
  const profileId = payload.profile_id ?? payload.profileId;
  const limit = Math.min(Math.max(payload.limit ?? 3, 1), 10);
  const polish = payload.polish === true;

  let mode: ScoutMode | undefined = VALID_MODES.includes(payload.mode as ScoutMode) ? payload.mode : undefined;

  const board = eventSlug
    ? await getEventBoard(eventSlug)
    : eventId
      ? await getEventBoardByEventId(eventId)
      : await getEventBoard("world-cup-hack");

  if (!board) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // Infer the mode when the caller didn't pass one.
  if (!mode) {
    if (teamId) mode = "players_for_team";
    else if (profileId) mode = "teams_for_player";
  }

  let recommendations;

  switch (mode) {
    case "players_for_team":
      if (!teamId) {
        return NextResponse.json({ error: "team_id is required for players_for_team." }, { status: 400 });
      }
      recommendations = recommendProfilesForTeam(board, teamId, limit);
      break;
    case "teams_for_player":
      if (!profileId) {
        return NextResponse.json({ error: "profile_id is required for teams_for_player." }, { status: 400 });
      }
      recommendations = recommendTeamsForProfile(board, profileId, limit);
      break;
    case "teammates_for_player":
      if (!profileId) {
        return NextResponse.json({ error: "profile_id is required for teammates_for_player." }, { status: 400 });
      }
      recommendations = recommendTeammatesForProfile(board, profileId, limit);
      break;
    default: {
      // No team_id/profile_id given — show players for the first club as a demo default.
      const fallbackTeam = board.teams[0];
      mode = "players_for_team";
      recommendations = fallbackTeam ? recommendProfilesForTeam(board, fallbackTeam.id, limit) : [];
    }
  }

  let polished = false;
  if (polish) {
    const result = await polishRecommendations(recommendations);
    recommendations = result.recommendations;
    polished = result.polished;
  }

  return NextResponse.json({
    event_slug: board.event.slug,
    event_id: board.event.id,
    mode,
    polished,
    nemotron_available: Boolean(process.env.NVIDIA_API_KEY),
    recommendations,
  });
}
