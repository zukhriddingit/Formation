"use client";

import { ArrowLeft, BrainCircuit, CheckCircle2, Loader2, MessageSquare, Send, ShieldCheck, Trophy, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlayerCard } from "@/components/player-card";
import { RoleBadge } from "@/components/role-badge";
import { VibeBadge } from "@/components/vibe-badge";
import { captureClientEvent } from "@/lib/posthog";
import { recommendProfilesForTeam } from "@/lib/scout/scoring";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getTeamMemberCount,
  isTeamMember,
  loadCurrentProfile,
  loadEventBoardFromSupabase,
  loadEventBySlug,
  pendingRequestForTeam,
} from "@/lib/supabase/domain";
import type { EventBoard, JoinRequest, Profile, Team } from "@/lib/types";

function profileName(profiles: Profile[], profileId: string) {
  return profiles.find((profile) => profile.id === profileId)?.name ?? "Unknown player";
}

function getTeam(board: EventBoard, teamId: string) {
  return board.teams.find((team) => team.id === teamId) ?? null;
}

function getTeamMembers(board: EventBoard, team: Team) {
  return board.team_members
    .filter((member) => member.team_id === team.id)
    .map((member) => {
      const profile = board.profiles.find((item) => item.id === member.profile_id);
      return profile ? { membership: member, profile } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function TeamPageClient({
  initialBoard,
  eventSlug,
  teamId,
}: {
  initialBoard: EventBoard;
  eventSlug: string;
  teamId: string;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function refreshTeam() {
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
        await captureClientEvent("anonymous_player_signed_in", { eventSlug });
      }

      const event = await loadEventBySlug(supabase, eventSlug);

      if (!event) {
        throw new Error("This event is no longer available.");
      }

      const [freshBoard, profile] = await Promise.all([
        loadEventBoardFromSupabase(supabase, eventSlug, { includeJoinRequests: true }),
        loadCurrentProfile(supabase, event.id, user),
      ]);

      if (freshBoard) {
        setBoard(freshBoard);
      }
      setCurrentProfile(profile);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not refresh the team.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const team = getTeam(board, teamId);
  const members = team ? getTeamMembers(board, team) : [];
  const owner = team ? board.profiles.find((profile) => profile.id === team.owner_profile_id) ?? null : null;
  const idea = team?.idea_id ? board.ideas.find((item) => item.id === team.idea_id) ?? null : null;
  const isOwner = Boolean(team && currentProfile?.id === team.owner_profile_id);
  const isMember = Boolean(team && isTeamMember(board, team.id, currentProfile?.id));
  const memberCount = team ? getTeamMemberCount(board, team.id) : 0;
  const openSlots = team ? Math.max(team.max_size - memberCount, 0) : 0;
  const isFormed = Boolean(team && (team.status === "formed" || memberCount >= team.max_size));
  const requestClosedLabel = team ? (team.status !== "forming" ? "Roster locked" : memberCount >= team.max_size ? "Team full" : null) : null;
  const pendingRequest = team ? pendingRequestForTeam(board, team.id, currentProfile?.id) : null;
  const pendingRequests = team ? board.join_requests.filter((request) => request.team_id === team.id && request.status === "pending") : [];
  const recommendations = team ? recommendProfilesForTeam(board, team.id, 3) : [];

  async function requestToJoin() {
    if (!supabase || !team || !currentProfile) {
      setError("Create your player card before requesting a transfer.");
      return;
    }

    if (team.status !== "forming" || getTeamMemberCount(board, team.id) >= team.max_size) {
      setNotice(team.status !== "forming" ? "Roster locked." : "Team full.");
      return;
    }

    setIsMutating(true);
    setError(null);
    setNotice(null);

    try {
      const { error: insertError } = await supabase.from("join_requests").insert({
        event_id: board.event.id,
        team_id: team.id,
        requester_profile_id: currentProfile.id,
        message: requestMessage.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setNotice("You already have a pending request for this team.");
          return;
        }
        throw insertError;
      }

      setShowRequestForm(false);
      setRequestMessage("");
      setNotice("Transfer request sent.");
      await captureClientEvent("join_request_created", { eventSlug, teamId: team.id });
      await refreshTeam();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the join request.");
    } finally {
      setIsMutating(false);
    }
  }

  async function decideRequest(request: JoinRequest, decision: "accepted" | "rejected") {
    if (!supabase) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setNotice(null);

    try {
      const { error: rpcError } = await supabase.rpc("decide_join_request", {
        p_request_id: request.id,
        p_decision: decision,
      });

      if (rpcError) {
        throw rpcError;
      }

      setNotice(decision === "accepted" ? "Player added to the roster." : "Transfer request rejected.");
      await captureClientEvent("join_request_decided", { eventSlug, teamId, decision });
      await refreshTeam();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Could not update the request.");
    } finally {
      setIsMutating(false);
    }
  }

  if (!team) {
    return (
      <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Link href={`/e/${eventSlug}/board`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Transfer board
          </Link>
          <div className="mt-10">
            <EmptyState icon={Trophy} title="Team not found" description="This club may have been removed from the transfer board." />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/e/${eventSlug}/board`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Transfer board
          </Link>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-pitch-100" aria-hidden="true" /> : null}
        </div>

        {error ? <p className="mt-4 rounded-md border border-boot-400/30 bg-boot-400/10 p-3 text-sm text-boot-400">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-md border border-pitch-500/25 bg-pitch-500/10 p-3 text-sm text-pitch-100">{notice}</p> : null}

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Club page
              </p>
              <VibeBadge vibe={team.vibe} />
              {isFormed ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-pitch-500/35 bg-pitch-500/10 px-2.5 py-1 text-xs font-black text-pitch-100">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  formed
                </span>
              ) : null}
            </div>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{team.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
              {team.tagline ?? idea?.one_liner ?? "This club is forming its match-day roster."}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {team.roles_needed.length > 0 ? team.roles_needed.map((role) => <RoleBadge key={role}>{role}</RoleBadge>) : <span className="text-sm text-zinc-500">No open roles posted.</span>}
            </div>

            <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.045] p-4">
              {isOwner ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-trophy-100">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  You captain this club.
                </p>
              ) : isMember ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-pitch-100">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  You are signed to this roster.
                </p>
              ) : pendingRequest ? (
                <p className="text-sm font-semibold text-trophy-100">Your transfer request is pending.</p>
              ) : requestClosedLabel ? (
                <p className="text-sm font-semibold text-zinc-400">{requestClosedLabel}</p>
              ) : currentProfile ? (
                <div className="space-y-3">
                  {!showRequestForm ? (
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(true)}
                      disabled={isMutating || isFormed}
                      className="focus-ring inline-flex items-center gap-2 rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      Request to join
                    </button>
                  ) : (
                    <>
                      <textarea
                        value={requestMessage}
                        onChange={(event) => setRequestMessage(event.target.value)}
                        rows={3}
                        className="focus-ring w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                        placeholder="Optional note to the captain"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void requestToJoin()}
                          disabled={isMutating}
                          className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" aria-hidden="true" />
                          Send request
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRequestForm(false)}
                          className="focus-ring rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link href={`/e/${eventSlug}/onboard`} className="focus-ring inline-flex rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100">
                  Create player card to request transfer
                </Link>
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Roster sheet</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-zinc-950/60 p-4">
                <p className="text-3xl font-black text-white">{memberCount}</p>
                <p className="mt-1 text-sm text-zinc-400">signed</p>
              </div>
              <div className="rounded-md border border-white/10 bg-zinc-950/60 p-4">
                <p className="text-3xl font-black text-white">{openSlots}</p>
                <p className="mt-1 text-sm text-zinc-400">open</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Captain: <span className="font-semibold text-white">{owner?.name ?? "Unassigned"}</span>
            </p>
          </aside>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-2xl font-black text-white">Signed players</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {members.length > 0 ? (
                members.map(({ profile }) => <PlayerCard key={profile.id} profile={profile} compact />)
              ) : (
                <EmptyState icon={UsersRound} title="No one signed yet" description="The captain is still recruiting this club's first players." />
              )}
            </div>

            {isOwner ? (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-trophy-400" aria-hidden="true" />
                  <h2 className="text-2xl font-black text-white">Pending requests</h2>
                </div>
                <div className="space-y-3">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => (
                      <div key={request.id} className="rounded-lg border border-white/10 bg-zinc-950/75 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-black text-white">{profileName(board.profiles, request.requester_profile_id)}</p>
                            <p className="mt-1 text-sm text-zinc-400">{request.message || "No message added."}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void decideRequest(request, "accepted")}
                              disabled={isMutating}
                              className="focus-ring inline-flex items-center gap-1 rounded-md bg-pitch-500 px-3 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => void decideRequest(request, "rejected")}
                              disabled={isMutating}
                              className="focus-ring inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={MessageSquare} title="No pending requests" description="Transfer requests for your club appear here." />
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <aside>
            <div className="mb-4 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-trophy-400" aria-hidden="true" />
              <h2 className="text-2xl font-black text-white">Scout picks</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border border-white/10 bg-zinc-950/75 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-white">{recommendation.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{recommendation.subtitle}</p>
                    </div>
                    <span className="rounded-md bg-pitch-500/10 px-2 py-1 text-sm font-black text-pitch-100">{recommendation.score}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
