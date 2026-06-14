import type { EventBoard, Idea, Profile, Team } from "@/lib/types";
import { normalizeToken, uniqueStrings } from "@/lib/utils";

export type ScoutRecommendation = {
  id: string;
  type: "profile" | "team";
  score: number;
  title: string;
  subtitle: string;
  reasons: string[];
};

function tokens(values: string[]) {
  return new Set(values.flatMap((value) => normalizeToken(value).split(/\s+/)).filter(Boolean));
}

function overlapCount(left: Set<string>, right: Set<string>) {
  let score = 0;

  left.forEach((value) => {
    if (right.has(value)) {
      score += 1;
    }
  });

  return score;
}

function teamNeedTokens(team: Team, idea: Idea | null) {
  return tokens(uniqueStrings([...(team.roles_needed ?? []), ...(idea?.roles_needed ?? []), ...(idea?.tags ?? [])]));
}

function profileTokens(profile: Profile) {
  return tokens(uniqueStrings([...profile.skills, ...profile.positions, ...profile.interests]));
}

export function scoreProfileForTeam(profile: Profile, team: Team, idea: Idea | null): ScoutRecommendation {
  const needs = teamNeedTokens(team, idea);
  const player = profileTokens(profile);
  const matchedTerms = overlapCount(needs, player);
  const reasons: string[] = [];
  let score = 35 + matchedTerms * 14;

  if (profile.vibe && team.vibe && profile.vibe === team.vibe) {
    score += 18;
    reasons.push(`Shares the ${profile.vibe} club vibe`);
  }

  if (profile.looking_for_team) {
    score += 12;
    reasons.push("Available in the transfer window");
  }

  const matchedRoles = team.roles_needed.filter((role) => {
    const roleToken = normalizeToken(role);
    return [...profile.skills, ...profile.positions].some((value) => normalizeToken(value).includes(roleToken));
  });

  if (matchedRoles.length > 0) {
    reasons.push(`Covers ${matchedRoles.slice(0, 2).join(", ")}`);
  }

  if (idea?.tags.some((tag) => profile.interests.map(normalizeToken).includes(normalizeToken(tag)))) {
    score += 8;
    reasons.push("Has matching problem-space interest");
  }

  if (reasons.length === 0) {
    reasons.push("Broad skill overlap with this club");
  }

  return {
    id: profile.id,
    type: "profile",
    score: Math.min(score, 100),
    title: profile.name,
    subtitle: profile.headline ?? "Available player",
    reasons,
  };
}

export function scoreTeamForProfile(team: Team, idea: Idea | null, profile: Profile, memberCount: number): ScoutRecommendation {
  const needs = teamNeedTokens(team, idea);
  const player = profileTokens(profile);
  const matchedTerms = overlapCount(needs, player);
  const openSlots = Math.max(team.max_size - memberCount, 0);
  const reasons: string[] = [];
  let score = 34 + matchedTerms * 13;

  if (profile.vibe && team.vibe && profile.vibe === team.vibe) {
    score += 16;
    reasons.push(`Matches your ${profile.vibe} pace`);
  }

  if (openSlots > 0) {
    score += Math.min(openSlots * 6, 18);
    reasons.push(`${openSlots} roster slot${openSlots === 1 ? "" : "s"} open`);
  }

  const matchedRoles = team.roles_needed.filter((role) => {
    const roleToken = normalizeToken(role);
    return [...profile.skills, ...profile.positions].some((value) => normalizeToken(value).includes(roleToken));
  });

  if (matchedRoles.length > 0) {
    reasons.push(`They need ${matchedRoles.slice(0, 2).join(", ")}`);
  }

  if (idea?.tags.some((tag) => profile.interests.map(normalizeToken).includes(normalizeToken(tag)))) {
    score += 8;
    reasons.push("Idea tags line up with your interests");
  }

  if (reasons.length === 0) {
    reasons.push("Good baseline fit from your player card");
  }

  return {
    id: team.id,
    type: "team",
    score: Math.min(score, 100),
    title: team.name,
    subtitle: team.tagline ?? idea?.one_liner ?? "Open club",
    reasons,
  };
}

export function recommendProfilesForTeam(board: EventBoard, teamId: string, limit = 4) {
  const team = board.teams.find((item) => item.id === teamId);

  if (!team) {
    return [];
  }

  const idea = team.idea_id ? board.ideas.find((item) => item.id === team.idea_id) ?? null : null;
  const memberIds = new Set(board.team_members.filter((member) => member.team_id === teamId).map((member) => member.profile_id));

  return board.profiles
    .filter((profile) => !memberIds.has(profile.id))
    .map((profile) => scoreProfileForTeam(profile, team, idea))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}

export function recommendTeamsForProfile(board: EventBoard, profileId: string, limit = 4) {
  const profile = board.profiles.find((item) => item.id === profileId);

  if (!profile) {
    return [];
  }

  return board.teams
    .map((team) => {
      const idea = team.idea_id ? board.ideas.find((item) => item.id === team.idea_id) ?? null : null;
      const memberCount = board.team_members.filter((member) => member.team_id === team.id).length;
      return scoreTeamForProfile(team, idea, profile, memberCount);
    })
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}
