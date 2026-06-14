"use client";

import { CheckCircle2, Filter, Lightbulb, Loader2, MessageSquare, Plus, RefreshCw, Trophy, UserRoundSearch, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { IdeaCard } from "@/components/idea-card";
import { PlayerCard } from "@/components/player-card";
import { TeamCard } from "@/components/team-card";
import { positionOptions, skillOptions, splitTags, vibeOptions } from "@/lib/options";
import { captureClientEvent } from "@/lib/posthog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getTeamMemberCount,
  isTeamMember,
  loadCurrentProfile,
  loadEventBoardFromSupabase,
  loadEventBySlug,
  pendingRequestForTeam,
} from "@/lib/supabase/domain";
import type { EventBoard, Idea, Profile, Team, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "players" | "clubs" | "teams";

type IdeaFormState = {
  title: string;
  one_liner: string;
  target_user: string;
  roles_needed: string[];
  tagsText: string;
  vibe: Vibe;
};

type TeamFormState = {
  name: string;
  tagline: string;
  vibe: Vibe;
  roles_needed: string[];
  max_size: number;
  idea_id: string;
};

const tabs: Array<{ key: TabKey; label: string; icon: typeof UsersRound }> = [
  { key: "players", label: "Players", icon: UsersRound },
  { key: "clubs", label: "Clubs / ideas", icon: Lightbulb },
  { key: "teams", label: "Teams", icon: Trophy },
];

const emptyIdeaForm: IdeaFormState = {
  title: "",
  one_liner: "",
  target_user: "",
  roles_needed: [],
  tagsText: "",
  vibe: "trying-to-win",
};

const emptyTeamForm: TeamFormState = {
  name: "",
  tagline: "",
  vibe: "trying-to-win",
  roles_needed: [],
  max_size: 4,
  idea_id: "",
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ToggleButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring rounded-md border px-3 py-2 text-sm font-semibold",
        selected
          ? "border-pitch-500/35 bg-pitch-500/15 text-pitch-100"
          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]",
      )}
    >
      {children}
    </button>
  );
}

function publicTeamForIdea(teams: Team[], ideaId: string) {
  return teams.find((team) => team.idea_id === ideaId) ?? null;
}

export function BoardTabs({ board }: { board: EventBoard }) {
  const [active, setActive] = useState<TabKey>("players");
  const [boardState, setBoardState] = useState<EventBoard>(board);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [ideaForm, setIdeaForm] = useState<IdeaFormState>(emptyIdeaForm);
  const [teamForm, setTeamForm] = useState<TeamFormState>(emptyTeamForm);
  const [requestingTeamId, setRequestingTeamId] = useState<string | null>(null);
  const [requestMessages, setRequestMessages] = useState<Record<string, string>>({});
  const [skillFilter, setSkillFilter] = useState("");
  const [vibeFilter, setVibeFilter] = useState("");
  const [onlyLooking, setOnlyLooking] = useState(false);
  const [onlyHasIdea, setOnlyHasIdea] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const isReadOnlyDemo = !supabase;

  async function refreshBoard() {
    if (!supabase) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const { data, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }

        user = data.user;
        await captureClientEvent("anonymous_player_signed_in", { eventSlug: board.event.slug });
      }

      const event = await loadEventBySlug(supabase, board.event.slug);

      if (!event) {
        throw new Error("This event is no longer available.");
      }

      const [freshBoard, profile] = await Promise.all([
        loadEventBoardFromSupabase(supabase, board.event.slug, { includeJoinRequests: true }),
        loadCurrentProfile(supabase, event.id, user),
      ]);

      if (freshBoard) {
        setBoardState(freshBoard);
      }

      setCurrentProfile(profile);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not refresh the board.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const teamMemberCounts = useMemo(() => {
    return new Map(boardState.teams.map((team) => [team.id, getTeamMemberCount(boardState, team.id)]));
  }, [boardState]);

  const filteredProfiles = useMemo(() => {
    return boardState.profiles.filter((profile) => {
      if (skillFilter && !profile.skills.includes(skillFilter)) {
        return false;
      }

      if (vibeFilter && profile.vibe !== vibeFilter) {
        return false;
      }

      if (onlyLooking && !profile.looking_for_team) {
        return false;
      }

      if (onlyHasIdea && !profile.has_idea) {
        return false;
      }

      return true;
    });
  }, [boardState.profiles, onlyHasIdea, onlyLooking, skillFilter, vibeFilter]);

  async function createIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabase || !currentProfile) {
      setError("Create your player card before posting an idea.");
      return;
    }

    if (!ideaForm.title.trim() || !ideaForm.one_liner.trim()) {
      setError("Idea title and one-liner are required.");
      return;
    }

    setIsMutating(true);

    try {
      const { error: insertError } = await supabase.from("ideas").insert({
        event_id: boardState.event.id,
        owner_profile_id: currentProfile.id,
        title: ideaForm.title.trim(),
        one_liner: ideaForm.one_liner.trim(),
        target_user: ideaForm.target_user.trim() || null,
        roles_needed: ideaForm.roles_needed,
        tags: splitTags(ideaForm.tagsText),
        vibe: ideaForm.vibe,
      });

      if (insertError) {
        throw insertError;
      }

      setIdeaForm(emptyIdeaForm);
      setShowIdeaForm(false);
      setNotice("Idea posted to the club market.");
      await captureClientEvent("idea_created", { eventSlug: boardState.event.slug });
      await refreshBoard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the idea.");
    } finally {
      setIsMutating(false);
    }
  }

  function startTeamFromIdea(idea: Idea) {
    setActive("teams");
    setShowTeamForm(true);
    setTeamForm({
      name: `${idea.title} FC`,
      tagline: idea.one_liner,
      vibe: idea.vibe ?? "trying-to-win",
      roles_needed: idea.roles_needed,
      max_size: 4,
      idea_id: idea.id,
    });
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabase || !currentProfile) {
      setError("Create your player card before creating a team.");
      return;
    }

    if (!teamForm.name.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsMutating(true);

    try {
      const { data: team, error: insertError } = await supabase
        .from("teams")
        .insert({
          event_id: boardState.event.id,
          owner_profile_id: currentProfile.id,
          idea_id: teamForm.idea_id || null,
          name: teamForm.name.trim(),
          tagline: teamForm.tagline.trim() || null,
          vibe: teamForm.vibe,
          roles_needed: teamForm.roles_needed,
          max_size: teamForm.max_size,
          status: "forming",
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (team?.id) {
        const { error: memberError } = await supabase.from("team_members").insert({
          team_id: team.id,
          profile_id: currentProfile.id,
          role: "Captain",
        });

        if (memberError) {
          throw memberError;
        }
      }

      setTeamForm(emptyTeamForm);
      setShowTeamForm(false);
      setNotice("Team created and added to the board.");
      await captureClientEvent("team_created", { eventSlug: boardState.event.slug });
      await refreshBoard();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the team.");
    } finally {
      setIsMutating(false);
    }
  }

  async function requestToJoin(team: Team) {
    setError(null);
    setNotice(null);

    if (!supabase || !currentProfile) {
      setError("Create your player card before requesting a transfer.");
      return;
    }

    if (pendingRequestForTeam(boardState, team.id, currentProfile.id)) {
      setNotice("You already have a pending request for this team.");
      return;
    }

    setIsMutating(true);

    try {
      const { error: insertError } = await supabase.from("join_requests").insert({
        event_id: boardState.event.id,
        team_id: team.id,
        requester_profile_id: currentProfile.id,
        message: requestMessages[team.id]?.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setNotice("You already have a pending request for this team.");
          return;
        }
        throw insertError;
      }

      setRequestingTeamId(null);
      setRequestMessages((current) => ({ ...current, [team.id]: "" }));
      setNotice(`Transfer request sent to ${team.name}.`);
      await captureClientEvent("join_request_created", { eventSlug: boardState.event.slug, teamId: team.id });
      await refreshBoard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the join request.");
    } finally {
      setIsMutating(false);
    }
  }

  function renderRequestControl(team: Team) {
    if (!currentProfile) {
      return (
        <Link
          href={`/e/${boardState.event.slug}/onboard`}
          className="focus-ring inline-flex w-full items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/[0.1]"
        >
          Create card to request transfer
        </Link>
      );
    }

    if (team.owner_profile_id === currentProfile.id) {
      return <p className="text-sm text-zinc-400">You captain this club.</p>;
    }

    if (isTeamMember(boardState, team.id, currentProfile.id)) {
      return (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-pitch-100">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          You are on this roster.
        </p>
      );
    }

    const pendingRequest = pendingRequestForTeam(boardState, team.id, currentProfile.id);

    if (pendingRequest) {
      return <p className="text-sm font-semibold text-trophy-100">Pending transfer request sent.</p>;
    }

    if (requestingTeamId !== team.id) {
      return (
        <button
          type="button"
          onClick={() => setRequestingTeamId(team.id)}
          disabled={isReadOnlyDemo || isMutating}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-trophy-400 px-3 py-2 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Request to join
        </button>
      );
    }

    return (
      <div className="space-y-3">
        <textarea
          value={requestMessages[team.id] ?? ""}
          onChange={(inputEvent) => setRequestMessages((current) => ({ ...current, [team.id]: inputEvent.target.value }))}
          rows={3}
          className="focus-ring w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          placeholder="Optional note to the captain"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void requestToJoin(team)}
            disabled={isMutating}
            className="focus-ring inline-flex flex-1 items-center justify-center rounded-md bg-pitch-500 px-3 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:opacity-60"
          >
            Send request
          </button>
          <button
            type="button"
            onClick={() => setRequestingTeamId(null)}
            className="focus-ring rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition",
                  selected ? "bg-pitch-500 text-pitch-950" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void refreshBoard()}
          disabled={isLoading || isReadOnlyDemo}
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      {error ? <p className="mt-4 rounded-md border border-boot-400/30 bg-boot-400/10 p-3 text-sm text-boot-400">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-md border border-pitch-500/25 bg-pitch-500/10 p-3 text-sm text-pitch-100">{notice}</p> : null}
      {isReadOnlyDemo ? (
        <p className="mt-4 rounded-md border border-trophy-400/25 bg-trophy-400/10 p-3 text-sm text-trophy-100">
          Supabase is not configured, so this board is read-only demo data.
        </p>
      ) : null}

      {active === "players" ? (
        <div className="mt-6">
          <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filters
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={skillFilter}
                onChange={(inputEvent) => setSkillFilter(inputEvent.target.value)}
                className="focus-ring rounded-md border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Any skill</option>
                {skillOptions.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <select
                value={vibeFilter}
                onChange={(inputEvent) => setVibeFilter(inputEvent.target.value)}
                className="focus-ring rounded-md border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white"
              >
                <option value="">Any vibe</option>
                {vibeOptions.map((vibe) => (
                  <option key={vibe} value={vibe}>
                    {vibe}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                <input type="checkbox" checked={onlyLooking} onChange={(inputEvent) => setOnlyLooking(inputEvent.target.checked)} className="accent-pitch-500" />
                Looking for team
              </label>
              <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                <input type="checkbox" checked={onlyHasIdea} onChange={(inputEvent) => setOnlyHasIdea(inputEvent.target.checked)} className="accent-pitch-500" />
                Has idea
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => <PlayerCard key={profile.id} profile={profile} />)
            ) : (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState icon={UserRoundSearch} title="No matching players" description="Adjust filters or invite players to create their cards." />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {active === "clubs" ? (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Club ideas</h2>
              <p className="mt-1 text-sm text-zinc-400">Pitch an idea, then recruit the positions you need.</p>
            </div>
            {currentProfile ? (
              <button
                type="button"
                onClick={() => setShowIdeaForm((current) => !current)}
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New idea
              </button>
            ) : (
              <Link href={`/e/${boardState.event.slug}/onboard`} className="focus-ring rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100">
                Create card to post
              </Link>
            )}
          </div>

          {showIdeaForm ? (
            <form onSubmit={createIdea} className="mb-6 rounded-lg border border-white/10 bg-zinc-950/75 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={ideaForm.title}
                  onChange={(inputEvent) => setIdeaForm((current) => ({ ...current, title: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                  placeholder="Idea title"
                  required
                />
                <input
                  value={ideaForm.target_user}
                  onChange={(inputEvent) => setIdeaForm((current) => ({ ...current, target_user: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                  placeholder="Target user"
                />
                <textarea
                  value={ideaForm.one_liner}
                  onChange={(inputEvent) => setIdeaForm((current) => ({ ...current, one_liner: inputEvent.target.value }))}
                  className="focus-ring resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white md:col-span-2"
                  rows={3}
                  placeholder="One-liner"
                  required
                />
                <input
                  value={ideaForm.tagsText}
                  onChange={(inputEvent) => setIdeaForm((current) => ({ ...current, tagsText: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                  placeholder="Tags, comma separated"
                />
                <select
                  value={ideaForm.vibe}
                  onChange={(inputEvent) => setIdeaForm((current) => ({ ...current, vibe: inputEvent.target.value as Vibe }))}
                  className="focus-ring rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white"
                >
                  {vibeOptions.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {positionOptions.map((role) => (
                  <ToggleButton
                    key={role}
                    selected={ideaForm.roles_needed.includes(role)}
                    onClick={() => setIdeaForm((current) => ({ ...current, roles_needed: toggleValue(current.roles_needed, role) }))}
                  >
                    {role}
                  </ToggleButton>
                ))}
              </div>
              <button
                type="submit"
                disabled={isMutating}
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:opacity-60"
              >
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Post idea
              </button>
            </form>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {boardState.ideas.length > 0 ? (
              boardState.ideas.map((idea) => {
                const associatedTeam = publicTeamForIdea(boardState.teams, idea.id);
                const ownedByCurrentUser = currentProfile?.id === idea.owner_profile_id;
                return (
                  <div key={idea.id} className="space-y-3">
                    <IdeaCard idea={idea} owner={boardState.profiles.find((profile) => profile.id === idea.owner_profile_id)} />
                    {ownedByCurrentUser ? (
                      <button
                        type="button"
                        onClick={() => startTeamFromIdea(idea)}
                        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-trophy-400 px-3 py-2 text-sm font-black text-ink-950 hover:bg-trophy-100"
                      >
                        <Trophy className="h-4 w-4" aria-hidden="true" />
                        Create team from this idea
                      </button>
                    ) : associatedTeam ? (
                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">{renderRequestControl(associatedTeam)}</div>
                    ) : (
                      <p className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-400">No club has formed around this idea yet.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState icon={Lightbulb} title="No clubs recruiting yet" description="Ideas show up here when captains post what they want to build." />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {active === "teams" ? (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white">Teams</h2>
              <p className="mt-1 text-sm text-zinc-400">Create a club, fill the missing roles, and lock the roster.</p>
            </div>
            {currentProfile ? (
              <button
                type="button"
                onClick={() => setShowTeamForm((current) => !current)}
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New team
              </button>
            ) : (
              <Link href={`/e/${boardState.event.slug}/onboard`} className="focus-ring rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100">
                Create card to start team
              </Link>
            )}
          </div>

          {showTeamForm ? (
            <form onSubmit={createTeam} className="mb-6 rounded-lg border border-white/10 bg-zinc-950/75 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={teamForm.name}
                  onChange={(inputEvent) => setTeamForm((current) => ({ ...current, name: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                  placeholder="Team name"
                  required
                />
                <select
                  value={teamForm.idea_id}
                  onChange={(inputEvent) => setTeamForm((current) => ({ ...current, idea_id: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white"
                >
                  <option value="">No linked idea</option>
                  {boardState.ideas
                    .filter((idea) => idea.owner_profile_id === currentProfile?.id)
                    .map((idea) => (
                      <option key={idea.id} value={idea.id}>
                        {idea.title}
                      </option>
                    ))}
                </select>
                <input
                  value={teamForm.tagline}
                  onChange={(inputEvent) => setTeamForm((current) => ({ ...current, tagline: inputEvent.target.value }))}
                  className="focus-ring rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white md:col-span-2"
                  placeholder="Tagline"
                />
                <select
                  value={teamForm.vibe}
                  onChange={(inputEvent) => setTeamForm((current) => ({ ...current, vibe: inputEvent.target.value as Vibe }))}
                  className="focus-ring rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white"
                >
                  {vibeOptions.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
                <label className="block">
                  <span className="sr-only">Max size</span>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={teamForm.max_size}
                    onChange={(inputEvent) => setTeamForm((current) => ({ ...current, max_size: Number(inputEvent.target.value) }))}
                    className="focus-ring w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                    placeholder="Max size"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {positionOptions.map((role) => (
                  <ToggleButton
                    key={role}
                    selected={teamForm.roles_needed.includes(role)}
                    onClick={() => setTeamForm((current) => ({ ...current, roles_needed: toggleValue(current.roles_needed, role) }))}
                  >
                    {role}
                  </ToggleButton>
                ))}
              </div>
              <button
                type="submit"
                disabled={isMutating}
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:opacity-60"
              >
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Create team
              </button>
            </form>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {boardState.teams.length > 0 ? (
              boardState.teams.map((team) => (
                <div key={team.id} className="space-y-3">
                  <TeamCard
                    team={team}
                    idea={boardState.ideas.find((idea) => idea.id === team.idea_id)}
                    memberCount={teamMemberCounts.get(team.id) ?? 0}
                    eventSlug={boardState.event.slug}
                  />
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">{renderRequestControl(team)}</div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState icon={Trophy} title="No teams formed yet" description="Teams appear once players start signing with clubs." />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
