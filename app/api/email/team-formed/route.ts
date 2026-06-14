import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildTeamFormedEmail } from "@/lib/email/templates";
import { getEventBoard, getEventBoardByEventId, getTeamRoster } from "@/lib/data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { uniqueStrings } from "@/lib/utils";

export const dynamic = "force-dynamic";

// NOTE: For production, gate this on an authenticated Supabase session and verify
// the caller owns/organizes the team before sending. We deliberately do NOT honor
// any client-supplied recipient list — recipients are always derived from the
// team roster on the server — so this can never be used as an open email relay.

type EmailLogRow = { recipient: string; status: string };

async function logEmails(eventId: string, teamId: string, rows: EmailLogRow[]) {
  const supabase = createSupabaseServiceClient();
  if (!supabase || rows.length === 0) {
    return;
  }
  try {
    await supabase.from("email_logs").insert(
      rows.map((row) => ({
        event_id: eventId,
        team_id: teamId,
        email_type: "team_formed",
        recipient: row.recipient,
        status: row.status,
      })),
    );
  } catch {
    // Non-fatal.
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    event_id?: string;
    eventId?: string;
    event_slug?: string;
    eventSlug?: string;
    team_id?: string;
    teamId?: string;
  };

  const eventSlug = payload.event_slug ?? payload.eventSlug;
  const eventId = payload.event_id ?? payload.eventId;
  const board = eventSlug
    ? await getEventBoard(eventSlug)
    : eventId
      ? await getEventBoardByEventId(eventId)
      : await getEventBoard("world-cup-hack");

  if (!board) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const teamId = payload.team_id ?? payload.teamId ?? board.teams[0]?.id;

  if (!teamId) {
    return NextResponse.json({ error: "No team found for intro email." }, { status: 400 });
  }

  const roster = getTeamRoster(board, teamId);

  if (!roster) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const members = roster.members.map(({ profile }) => profile);
  // Recipients are derived from the roster only (deduped) — never from the client.
  const recipients = uniqueStrings(members.map((profile) => profile.email));
  const email = buildTeamFormedEmail({ event: board.event, team: roster.team, members });

  // Demo mode: no Resend key (or nobody to email). Fake success + console log.
  if (!process.env.RESEND_API_KEY || recipients.length === 0) {
    console.info("[email:team-formed] DEMO MODE — would send", {
      to_count: recipients.length,
      subject: email.subject,
      team: roster.team.name,
      event: board.event.slug,
    });
    await logEmails(
      board.event.id,
      teamId,
      recipients.map((recipient) => ({ recipient, status: "demo" })),
    );
    await captureServerEvent(ANALYTICS_EVENTS.INTRO_EMAIL_SENT, {
      event_slug: board.event.slug,
      team_id: teamId,
      recipients_count: recipients.length,
      sent_count: 0,
      success: recipients.length > 0,
      demo: true,
    });
    return NextResponse.json({
      mode: "demo",
      message:
        recipients.length === 0
          ? "No member emails on file — generated the intro email payload for preview."
          : "Demo mode: Resend isn't configured, so the email was logged to the server console instead of sent.",
      subject: email.subject,
      recipients_count: recipients.length,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? "Formation <onboarding@resend.dev>";

  // Send one message per recipient so nobody sees anyone else's address.
  const results = await Promise.all(
    recipients.map(async (to): Promise<EmailLogRow & { ok: boolean; error?: string }> => {
      try {
        const result = await resend.emails.send({
          from,
          to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        return { recipient: to, ok: !result.error, status: result.error ? "failed" : "sent", error: result.error?.message };
      } catch (error) {
        return { recipient: to, ok: false, status: "failed", error: error instanceof Error ? error.message : "send failed" };
      }
    }),
  );

  const sentCount = results.filter((r) => r.ok).length;
  await logEmails(
    board.event.id,
    teamId,
    results.map(({ recipient, status }) => ({ recipient, status })),
  );
  await captureServerEvent(ANALYTICS_EVENTS.INTRO_EMAIL_SENT, {
    event_slug: board.event.slug,
    team_id: teamId,
    recipients_count: recipients.length,
    sent_count: sentCount,
    success: sentCount > 0,
    demo: false,
  });

  if (sentCount === 0) {
    return NextResponse.json(
      {
        mode: "error",
        message: results.find((r) => r.error)?.error ?? "Resend rejected the email.",
        sent_count: 0,
        recipients_count: recipients.length,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode: "sent",
    message: `Intro email sent to ${sentCount} of ${recipients.length} teammate${recipients.length === 1 ? "" : "s"}.`,
    sent_count: sentCount,
    recipients_count: recipients.length,
  });
}
