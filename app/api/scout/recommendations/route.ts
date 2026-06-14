import { NextResponse } from "next/server";
import { getEventBoard } from "@/lib/data";
import { recommendProfilesForTeam, recommendTeamsForProfile } from "@/lib/scout/scoring";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    eventSlug?: string;
    teamId?: string;
    profileId?: string;
    limit?: number;
  };
  const eventSlug = payload.eventSlug ?? "world-cup-hack";
  const board = await getEventBoard(eventSlug);
  const limit = payload.limit ?? 4;

  if (payload.teamId) {
    return NextResponse.json({
      eventSlug,
      recommendations: recommendProfilesForTeam(board, payload.teamId, limit),
      mode: process.env.OPENAI_API_KEY ? "deterministic_with_openai_available" : "deterministic",
      todo: "Optionally blend deterministic scoring with embeddings or LLM explanations after the demo is stable.",
    });
  }

  if (payload.profileId) {
    return NextResponse.json({
      eventSlug,
      recommendations: recommendTeamsForProfile(board, payload.profileId, limit),
      mode: process.env.OPENAI_API_KEY ? "deterministic_with_openai_available" : "deterministic",
      todo: "Optionally blend deterministic scoring with embeddings or LLM explanations after the demo is stable.",
    });
  }

  const defaultTeam = board.teams[0];

  return NextResponse.json({
    eventSlug,
    recommendations: defaultTeam ? recommendProfilesForTeam(board, defaultTeam.id, limit) : [],
    mode: "deterministic",
    todo: "Pass teamId for teammate recommendations or profileId for club recommendations.",
  });
}
