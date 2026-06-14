export type Vibe = "serious" | "chill" | "beginner-friendly" | "trying-to-win";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type EventRecord = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  starts_at: string | null;
  organizer_email: string | null;
  premium_until: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  positions: string[];
  interests: string[];
  wants_to_build: string | null;
  has_idea: boolean;
  looking_for_team: boolean;
  vibe: Vibe | null;
  experience_level: ExperienceLevel | null;
  created_at: string;
  updated_at: string;
};

export type Idea = {
  id: string;
  event_id: string;
  owner_profile_id: string;
  title: string;
  one_liner: string;
  target_user: string | null;
  roles_needed: string[];
  tags: string[];
  vibe: Vibe | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  event_id: string;
  owner_profile_id: string;
  idea_id: string | null;
  name: string;
  tagline: string | null;
  vibe: Vibe | null;
  roles_needed: string[];
  max_size: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  profile_id: string;
  role: string | null;
  created_at: string;
};

export type JoinRequest = {
  id: string;
  event_id: string;
  team_id: string;
  requester_profile_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  decided_at: string | null;
};

export type Payment = {
  id: string;
  event_id: string;
  stripe_checkout_session_id: string | null;
  buyer_email: string | null;
  amount_cents: number | null;
  status: string;
  created_at: string;
};

export type EmailLog = {
  id: string;
  event_id: string;
  team_id: string;
  email_type: string | null;
  recipient: string | null;
  status: string | null;
  created_at: string;
};

export type EventBoard = {
  event: EventRecord;
  profiles: Profile[];
  ideas: Idea[];
  teams: Team[];
  team_members: TeamMember[];
  join_requests: JoinRequest[];
};

export type TeamRoster = {
  team: Team;
  idea: Idea | null;
  owner: Profile | null;
  members: Array<{
    membership: TeamMember;
    profile: Profile;
  }>;
};

export type ExtractedProfileDraft = {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
  positions: string[];
  interests: string[];
  wants_to_build: string;
  experience_level: ExperienceLevel;
};

/**
 * Structured draft returned by POST /api/profile/extract. This is a *draft only*
 * — never persisted directly. The onboarding UI maps it into editable form state
 * and the participant confirms before saving.
 */
export type ProfileExtraction = {
  name: string | null;
  email: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  positions: string[];
  interests: string[];
  experience_level: ExperienceLevel | null;
  linkedin_url: string | null;
  confidence: number;
  notes: string[];
};

export type ScoutMode = "teammates_for_player" | "players_for_team" | "teams_for_player";

export type ScoutRecommendation = {
  type: "profile" | "team";
  id: string;
  score: number;
  title: string;
  subtitle: string;
  reasons: string[];
  matched_skills: string[];
  missing_role_fit: string[];
  vibe_match: boolean;
};
