import type { EventRecord, Profile, Team } from "@/lib/types";
import { appUrl } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * "You've been signed" team intro email. Fun, not cringe - one light team
 * metaphor, then straight to the useful bits (roster + link + kickoff nudge).
 */
export function buildTeamFormedEmail({
  event,
  team,
  members,
}: {
  event: EventRecord;
  team: Team;
  members: Profile[];
}) {
  const memberList = members.map((member) => `${member.name}${member.headline ? ` - ${member.headline}` : ""}`);
  const teamUrl = appUrl(`/e/${event.slug}/teams/${team.id}`);
  const subject = `You're signed with ${team.name} on Formation`;
  const kickoff = "Say hi, divide up the roles, and lock your first milestone before the whistle.";

  const text = [
    `You're signed with ${team.name} for ${event.name}. 🎽`,
    team.tagline ?? "",
    "",
    "Your squad:",
    ...memberList.map((member) => `- ${member}`),
    "",
    kickoff,
    "",
    `Team page: ${teamUrl}`,
    "",
    "- The Formation scout",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; background: #070808; color: #f6f7f4; padding: 32px;">
      <div style="max-width: 620px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 28px; background: #101313;">
        <p style="color: #f5c64f; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; margin: 0 0 4px;">Formation team workspace</p>
        <h1 style="margin: 0 0 12px; font-size: 26px;">You're signed with ${escapeHtml(team.name)} 🎽</h1>
        <p style="color: #cbd5cf; margin: 0 0 4px;">${escapeHtml(team.tagline ?? `Your roster for ${event.name} is set.`)}</p>
        <h2 style="font-size: 15px; margin: 24px 0 8px; color: #ffffff;">Your squad</h2>
        <ul style="padding-left: 20px; color: #e6e9e4; margin: 0;">
          ${members
            .map((member) => `<li>${escapeHtml(member.name)}${member.headline ? ` - ${escapeHtml(member.headline)}` : ""}</li>`)
            .join("")}
        </ul>
        <p style="color: #cbd5cf; margin: 20px 0 0;">${escapeHtml(kickoff)}</p>
        <a href="${teamUrl}" style="display: inline-block; margin-top: 20px; background: #31c56f; color: #061b13; padding: 12px 16px; border-radius: 10px; font-weight: 700; text-decoration: none;">Open your team page</a>
        <p style="color: #6b746e; font-size: 12px; margin-top: 24px;">- The Formation scout</p>
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}
