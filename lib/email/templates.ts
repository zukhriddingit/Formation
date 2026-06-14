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
  const subject = `${team.name} is ready for kickoff at ${event.name}`;
  const text = [
    `${team.name} has formed on Formation.`,
    team.tagline ?? "",
    "",
    "Roster:",
    ...memberList.map((member) => `- ${member}`),
    "",
    `Team page: ${teamUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; background: #070808; color: #f6f7f4; padding: 32px;">
      <div style="max-width: 620px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 28px; background: #101313;">
        <p style="color: #f5c64f; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">Formation transfer desk</p>
        <h1 style="margin: 0 0 12px; font-size: 28px;">${escapeHtml(team.name)} is ready for kickoff</h1>
        <p style="color: #cbd5cf;">${escapeHtml(team.tagline ?? `${event.name} club intro`)}</p>
        <h2 style="font-size: 16px; margin-top: 24px;">Roster</h2>
        <ul style="padding-left: 20px;">
          ${members.map((member) => `<li>${escapeHtml(member.name)}${member.headline ? ` - ${escapeHtml(member.headline)}` : ""}</li>`).join("")}
        </ul>
        <a href="${teamUrl}" style="display: inline-block; margin-top: 20px; background: #31c56f; color: #061b13; padding: 12px 16px; border-radius: 10px; font-weight: 700;">Open team page</a>
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}
