/**
 * Deterministic scout scoring.
 *
 * The scout never depends on an LLM to produce recommendations — every rec here
 * is computed from structured profile/team data with transparent, explainable
 * rules. (An optional Nemotron pass can *polish* the reason wording elsewhere.)
 *
 * Three modes, all built from the same scoring primitives:
 *   - players_for_team    -> rank free agents for a team
 *   - teams_for_player    -> rank teams for a player
 *   - teammates_for_player→ rank complementary players for a player
 */
import type { EventBoard, Idea, Profile, ScoutRecommendation, Team, Vibe } from "@/lib/types";
import { normalizeToken, uniqueStrings } from "@/lib/utils";

// Re-export so existing imports of `ScoutRecommendation` from this module keep working.
export type { ScoutRecommendation } from "@/lib/types";

const VIBE_ALLIES: Record<Vibe, Vibe[]> = {
  serious: ["trying-to-win"],
  "trying-to-win": ["serious"],
  chill: ["beginner-friendly"],
  "beginner-friendly": ["chill"],
};

type VibeRelation = "same" | "ally" | "clash" | "unknown";

function vibeRelation(a: Vibe | null, b: Vibe | null): VibeRelation {
  if (!a || !b) return "unknown";
  if (a === b) return "same";
  if (VIBE_ALLIES[a]?.includes(b)) return "ally";
  return "clash";
}

/** Loose label match: equal, or one normalized token contains the other. */
function labelMatches(a: string, b: string) {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function anyMatch(label: string, against: string[]) {
  return against.some((candidate) => labelMatches(label, candidate));
}

function teamNeedLabels(team: Team, idea: Idea | null) {
  return uniqueStrings([...(team.roles_needed ?? []), ...(idea?.roles_needed ?? [])]);
}

function teamTagLabels(idea: Idea | null) {
  return uniqueStrings([...(idea?.tags ?? [])]);
}

function playerLabels(profile: Pick<Profile, "skills" | "positions">) {
  return uniqueStrings([...(profile.positions ?? []), ...(profile.skills ?? [])]);
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** A minimal player shape so we can score real profiles AND onboarding drafts. */
export type PlayerSignals = {
  id?: string;
  name?: string;
  headline?: string | null;
  skills: string[];
  positions: string[];
  interests: string[];
  vibe: Vibe | null;
  looking_for_team?: boolean;
};

// --------------------------------------------------------------------------
// players_for_team: rank a candidate player for a given team
// --------------------------------------------------------------------------
export function scoreProfileForTeam(
  profile: Profile,
  team: Team,
  idea: Idea | null,
  memberCount: number,
  alreadyOnAnyTeam = false,
): ScoutRecommendation {
  const needs = teamNeedLabels(team, idea);
  const tags = teamTagLabels(idea);
  const labels = playerLabels(profile);
  const openSlots = Math.max(team.max_size - memberCount, 0);
  const teamFull = openSlots <= 0;

  const matchedRoles = needs.filter((role) => anyMatch(role, labels));
  const matchedSkills = labels.filter((label) => anyMatch(label, needs));
  const missingRoleFit = needs.filter((role) => !anyMatch(role, labels));
  const sharedInterests = (profile.interests ?? []).filter((interest) => anyMatch(interest, tags));
  const relation = vibeRelation(profile.vibe, team.vibe);

  const reasons: string[] = [];
  let score = 32;

  if (matchedRoles.length > 0) {
    score += Math.min(matchedRoles.length * 18, 40);
    reasons.push(`Covers your open ${matchedRoles.slice(0, 2).join(" & ")} role${matchedRoles.length > 1 ? "s" : ""}`);
  }
  const extraSkillHits = Math.max(matchedSkills.length - matchedRoles.length, 0);
  if (extraSkillHits > 0) {
    score += Math.min(extraSkillHits * 5, 15);
  }
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 7, 21);
    reasons.push(`Also into ${sharedInterests.slice(0, 2).join(", ")}`);
  }
  if (profile.looking_for_team) {
    score += 12;
    reasons.push("Available for a team");
  }
  if (openSlots > 0) {
    score += Math.min(openSlots * 5, 15);
  }
  if (relation === "same") {
    score += 18;
    reasons.push(`Same ${profile.vibe} vibe as the team`);
  } else if (relation === "ally") {
    score += 9;
    reasons.push(`Compatible ${profile.vibe} energy`);
  } else if (relation === "clash") {
    score -= 18;
    reasons.push(`Different pace (${profile.vibe} vs ${team.vibe})`);
  }
  if (alreadyOnAnyTeam) {
    score -= 22;
    reasons.push("Already signed to another team");
  }
  if (teamFull) {
    score -= 28;
  }
  if (reasons.length === 0) {
    reasons.push("Broad skill overlap with this team");
  }

  return {
    type: "profile",
    id: profile.id,
    score: clamp(score),
    title: profile.name,
    subtitle: profile.headline ?? "Available player",
    reasons,
    matched_skills: uniqueStrings(matchedSkills).slice(0, 6),
    missing_role_fit: uniqueStrings(missingRoleFit).slice(0, 4),
    vibe_match: relation === "same" || relation === "ally",
  };
}

// --------------------------------------------------------------------------
// teams_for_player: rank a team for a given player (or onboarding draft)
// --------------------------------------------------------------------------
export function scoreTeamForPlayer(
  team: Team,
  idea: Idea | null,
  player: PlayerSignals,
  memberCount: number,
): ScoutRecommendation {
  const needs = teamNeedLabels(team, idea);
  const tags = teamTagLabels(idea);
  const labels = playerLabels(player);
  const openSlots = Math.max(team.max_size - memberCount, 0);
  const teamFull = openSlots <= 0;

  const matchedRoles = needs.filter((role) => anyMatch(role, labels));
  const matchedSkills = labels.filter((label) => anyMatch(label, needs));
  const missingRoleFit = needs.filter((role) => !anyMatch(role, labels));
  const sharedInterests = (player.interests ?? []).filter((interest) => anyMatch(interest, tags));
  const relation = vibeRelation(player.vibe, team.vibe);

  const reasons: string[] = [];
  let score = 32;

  if (matchedRoles.length > 0) {
    score += Math.min(matchedRoles.length * 18, 40);
    reasons.push(`They need ${matchedRoles.slice(0, 2).join(" & ")}, which you bring`);
  }
  const extraSkillHits = Math.max(matchedSkills.length - matchedRoles.length, 0);
  if (extraSkillHits > 0) {
    score += Math.min(extraSkillHits * 5, 15);
  }
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 7, 21);
    reasons.push(`Building in ${sharedInterests.slice(0, 2).join(", ")} - your space`);
  }
  if (openSlots > 0) {
    score += Math.min(openSlots * 5, 15);
    reasons.push(`${openSlots} roster slot${openSlots === 1 ? "" : "s"} still open`);
  }
  if (relation === "same") {
    score += 18;
    reasons.push(`Same ${player.vibe} vibe`);
  } else if (relation === "ally") {
    score += 9;
    reasons.push(`Compatible ${player.vibe} energy`);
  } else if (relation === "clash") {
    score -= 18;
    reasons.push(`Different pace (${player.vibe} vs ${team.vibe})`);
  }
  if (teamFull) {
    score -= 28;
    reasons.push("Roster is currently full");
  }
  if (reasons.length === 0) {
    reasons.push("Solid baseline fit from your player card");
  }

  return {
    type: "team",
    id: team.id,
    score: clamp(score),
    title: team.name,
    subtitle: team.tagline ?? idea?.one_liner ?? "Open team",
    reasons,
    matched_skills: uniqueStrings(matchedSkills).slice(0, 6),
    missing_role_fit: uniqueStrings(missingRoleFit).slice(0, 4),
    vibe_match: relation === "same" || relation === "ally",
  };
}

// --------------------------------------------------------------------------
// teammates_for_player: rank complementary players for a given player
// --------------------------------------------------------------------------
export function scoreTeammateForPlayer(
  candidate: Profile,
  player: PlayerSignals,
  playerIdea: Idea | null,
  candidateOnAnyTeam: boolean,
): ScoutRecommendation {
  const candidateLabels = playerLabels(candidate);
  const ownLabels = playerLabels(player);
  const ideaNeeds = uniqueStrings([...(playerIdea?.roles_needed ?? [])]);

  // Complementary = positions/skills the candidate has that the player lacks.
  const complementary = candidateLabels.filter((label) => !anyMatch(label, ownLabels));
  const fillsIdeaRoles = ideaNeeds.filter((role) => anyMatch(role, candidateLabels));
  const sharedInterests = (candidate.interests ?? []).filter((interest) => anyMatch(interest, player.interests ?? []));
  const missingRoleFit = ideaNeeds.filter((role) => !anyMatch(role, candidateLabels));
  const relation = vibeRelation(player.vibe, candidate.vibe);

  const reasons: string[] = [];
  let score = 30;

  if (fillsIdeaRoles.length > 0) {
    score += Math.min(fillsIdeaRoles.length * 18, 40);
    reasons.push(`Fills your missing ${fillsIdeaRoles.slice(0, 2).join(" & ")} role${fillsIdeaRoles.length > 1 ? "s" : ""}`);
  }
  if (complementary.length > 0) {
    score += Math.min(complementary.length * 8, 28);
    if (fillsIdeaRoles.length === 0) {
      reasons.push(`Adds ${complementary.slice(0, 2).join(", ")} to your squad`);
    }
  }
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 7, 21);
    reasons.push(`Both into ${sharedInterests.slice(0, 2).join(", ")}`);
  }
  if (candidate.looking_for_team) {
    score += 12;
    reasons.push("Looking for a team right now");
  } else {
    score -= 8;
  }
  if (relation === "same") {
    score += 16;
    reasons.push(`Same ${candidate.vibe} vibe`);
  } else if (relation === "ally") {
    score += 8;
    reasons.push(`Compatible ${candidate.vibe} energy`);
  } else if (relation === "clash") {
    score -= 16;
    reasons.push(`Different pace (${candidate.vibe} vs ${player.vibe})`);
  }
  if (candidateOnAnyTeam) {
    score -= 22;
    reasons.push("Already signed to another team");
  }
  if (reasons.length === 0) {
    reasons.push("Rounds out your lineup");
  }

  return {
    type: "profile",
    id: candidate.id,
    score: clamp(score),
    title: candidate.name,
    subtitle: candidate.headline ?? "Available player",
    reasons,
    matched_skills: uniqueStrings(complementary.length > 0 ? complementary : candidateLabels).slice(0, 6),
    missing_role_fit: uniqueStrings(missingRoleFit).slice(0, 4),
    vibe_match: relation === "same" || relation === "ally",
  };
}

// --------------------------------------------------------------------------
// Board-level helpers
// --------------------------------------------------------------------------
function memberCountOf(board: EventBoard, teamId: string) {
  return board.team_members.filter((member) => member.team_id === teamId).length;
}

function teamIdsForProfile(board: EventBoard, profileId: string) {
  return new Set(board.team_members.filter((member) => member.profile_id === profileId).map((member) => member.team_id));
}

function isOnAnyTeam(board: EventBoard, profileId: string) {
  return board.team_members.some((member) => member.profile_id === profileId);
}

function ideaForTeam(board: EventBoard, team: Team) {
  return team.idea_id ? board.ideas.find((item) => item.id === team.idea_id) ?? null : null;
}

function sortRecommendations(recommendations: ScoutRecommendation[]) {
  return recommendations.sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}

export function recommendProfilesForTeam(board: EventBoard, teamId: string, limit = 4): ScoutRecommendation[] {
  const team = board.teams.find((item) => item.id === teamId);
  if (!team) {
    return [];
  }

  const idea = ideaForTeam(board, team);
  const memberCount = memberCountOf(board, teamId);
  const currentMemberIds = new Set(board.team_members.filter((m) => m.team_id === teamId).map((m) => m.profile_id));
  // Never recommend a team's own owner as a signing for that team (robust even
  // if the CRUD layer hasn't inserted the owner into team_members yet).
  currentMemberIds.add(team.owner_profile_id);

  const recs = board.profiles
    .filter((profile) => !currentMemberIds.has(profile.id))
    .map((profile) => scoreProfileForTeam(profile, team, idea, memberCount, isOnAnyTeam(board, profile.id)));

  return sortRecommendations(recs).slice(0, limit);
}

export function recommendTeamsForProfile(board: EventBoard, profileId: string, limit = 4): ScoutRecommendation[] {
  const profile = board.profiles.find((item) => item.id === profileId);
  if (!profile) {
    return [];
  }

  const ownTeamIds = teamIdsForProfile(board, profileId);

  const recs = board.teams
    .filter((team) => !ownTeamIds.has(team.id) && team.owner_profile_id !== profileId)
    .map((team) => scoreTeamForPlayer(team, ideaForTeam(board, team), profile, memberCountOf(board, team.id)));

  return sortRecommendations(recs).slice(0, limit);
}

/** Used by onboarding to preview matching teams from an unsaved draft. */
export function recommendTeamsForSignals(board: EventBoard, player: PlayerSignals, limit = 3): ScoutRecommendation[] {
  const recs = board.teams.map((team) =>
    scoreTeamForPlayer(team, ideaForTeam(board, team), player, memberCountOf(board, team.id)),
  );
  return sortRecommendations(recs).slice(0, limit);
}

export function recommendTeammatesForProfile(board: EventBoard, profileId: string, limit = 4): ScoutRecommendation[] {
  const player = board.profiles.find((item) => item.id === profileId);
  if (!player) {
    return [];
  }

  const playerIdea =
    board.ideas.find((idea) => idea.owner_profile_id === profileId) ??
    (() => {
      const ownedTeam = board.teams.find((team) => team.owner_profile_id === profileId);
      return ownedTeam ? ideaForTeam(board, ownedTeam) : null;
    })();

  // Don't suggest people the player is already on a team with.
  const playerTeamIds = teamIdsForProfile(board, profileId);
  const existingTeammateIds = new Set(
    board.team_members.filter((member) => playerTeamIds.has(member.team_id)).map((member) => member.profile_id),
  );

  const recs = board.profiles
    .filter((candidate) => candidate.id !== profileId && !existingTeammateIds.has(candidate.id))
    .map((candidate) => scoreTeammateForPlayer(candidate, player, playerIdea, isOnAnyTeam(board, candidate.id)));

  return sortRecommendations(recs).slice(0, limit);
}
