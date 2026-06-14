/** Share-card text + permalink helpers (used by the team page and player cards). */
import type { Profile, Team } from "@/lib/types";
import { appUrl } from "@/lib/utils";

export function teamShareUrl(eventSlug: string, teamId: string) {
  return appUrl(`/e/${eventSlug}/teams/${teamId}`);
}

export function profileShareUrl(eventSlug: string, profileId: string) {
  return appUrl(`/e/${eventSlug}/p/${profileId}`);
}

export function teamShareText(team: Pick<Team, "name">) {
  return `I just signed with ${team.name} on Formation — forming hackathon teams like a transfer market.`;
}

export function profileShareText(profile: Pick<Profile, "name" | "headline">) {
  const role = profile.headline ? ` (${profile.headline})` : "";
  return `${profile.name}${role} is on the Formation transfer board — scouting a hackathon squad like a soccer club.`;
}
