import { notFound } from "next/navigation";
import { EventNotFound } from "@/components/event-not-found";
import { TeamPageClient } from "@/components/team-page-client";
import { getEventBoard, getTeamRoster, toClientBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const loadedBoard = await getEventBoard(slug);

  if (!loadedBoard) {
    return <EventNotFound slug={slug} />;
  }

  const board = toClientBoard(loadedBoard);
  const roster = getTeamRoster(board, teamId);

  if (!roster) {
    notFound();
  }

  return <TeamPageClient initialBoard={board} eventSlug={slug} teamId={teamId} />;
}
