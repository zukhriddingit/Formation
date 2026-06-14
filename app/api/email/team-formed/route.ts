import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildTeamFormedEmail } from "@/lib/email/templates";
import { getEventBoard, getTeamRoster } from "@/lib/data";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    eventSlug?: string;
    teamId?: string;
    recipients?: string[];
  };
  const eventSlug = payload.eventSlug ?? "world-cup-hack";
  const board = await getEventBoard(eventSlug);
  const teamId = payload.teamId ?? board.teams[0]?.id;

  if (!teamId) {
    return NextResponse.json({ error: "No team found for intro email." }, { status: 400 });
  }

  const roster = getTeamRoster(board, teamId);

  if (!roster) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const members = roster.members.map(({ profile }) => profile);
  const recipients = payload.recipients ?? members.map((profile) => profile.email).filter((email): email is string => Boolean(email));
  const email = buildTeamFormedEmail({
    event: board.event,
    team: roster.team,
    members,
  });

  if (!process.env.RESEND_API_KEY || recipients.length === 0) {
    return NextResponse.json({
      mode: "demo",
      message: "Resend is not configured or no recipients were available. Returning the generated email payload.",
      email,
      todo: "Add verified sender/domain handling and log email_logs rows after Resend is configured.",
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: "ScoutBoard <onboarding@resend.dev>",
    to: recipients,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return NextResponse.json({
    mode: "sent",
    message: "Team intro email sent.",
    result,
    todo: "Persist email_logs rows with delivery status for organizer audit views.",
  });
}
