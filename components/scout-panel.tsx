"use client";

import { ArrowUpRight, BrainCircuit, CheckCircle2, CircleDashed, Send, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ScoutMode, ScoutRecommendation } from "@/lib/types";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 75) return { bar: "bg-pitch-500", text: "text-pitch-100", ring: "border-pitch-500/30 bg-pitch-500/10" };
  if (score >= 50) return { bar: "bg-trophy-400", text: "text-trophy-100", ring: "border-trophy-400/30 bg-trophy-400/10" };
  return { bar: "bg-boot-400", text: "text-boot-400", ring: "border-boot-400/30 bg-boot-400/10" };
}

export function ScoutPanel({
  eventSlug,
  mode,
  recommendations,
  isTeamOwner = false,
  title = "Scout recommends",
  subtitle,
  polished = false,
}: {
  eventSlug: string;
  mode: ScoutMode;
  recommendations: ScoutRecommendation[];
  isTeamOwner?: boolean;
  title?: string;
  subtitle?: string;
  polished?: boolean;
}) {
  const fired = useRef(false);
  const [actedOn, setActedOn] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;
    track(ANALYTICS_EVENTS.SCOUT_RECOMMENDATION_VIEWED, {
      event_slug: eventSlug,
      mode,
      count: recommendations.length,
      polished,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRequestJoin(rec: ScoutRecommendation) {
    track(ANALYTICS_EVENTS.JOIN_REQUEST_SENT, { event_slug: eventSlug, mode, target_type: rec.type, direction: "player_to_team" });
    setActedOn((current) => ({ ...current, [rec.id]: "Request sent to the club" }));
  }

  function handleInvite(rec: ScoutRecommendation) {
    track(ANALYTICS_EVENTS.JOIN_REQUEST_SENT, { event_slug: eventSlug, mode, target_type: rec.type, direction: "team_to_player" });
    setActedOn((current) => ({ ...current, [rec.id]: "Invite sent to the player" }));
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-trophy-400/25 bg-trophy-400/10 p-2 text-trophy-400">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="text-xs text-zinc-400">{subtitle ?? "Top matches from deterministic scout scoring"}</p>
          </div>
        </div>
        {polished ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-trophy-400/25 bg-trophy-400/10 px-2 py-1 text-xs font-semibold text-trophy-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Nemotron
          </span>
        ) : null}
      </div>

      {recommendations.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-center text-sm text-zinc-400">
          No matches yet — they&apos;ll appear as more players and clubs join the board.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {recommendations.map((rec, index) => {
            const tone = scoreTone(rec.score);
            const profileHref = `/e/${eventSlug}/p/${rec.id}`;
            const teamHref = `/e/${eventSlug}/teams/${rec.id}`;
            const acted = actedOn[rec.id];

            return (
              <li key={`${rec.type}-${rec.id}`} className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-black text-white">
                      <span className="text-xs text-zinc-500">#{index + 1}</span>
                      <span className="truncate">{rec.title}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-zinc-400">{rec.subtitle}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-md border px-2 py-1 text-sm font-black", tone.ring, tone.text)}>
                    {rec.score}
                  </span>
                </div>

                {/* Score meter */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.08]">
                  <div className={cn("h-1.5 rounded-full", tone.bar)} style={{ width: `${rec.score}%` }} />
                </div>

                {/* Reasons as chips */}
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {rec.reasons.slice(0, 4).map((reason) => (
                    <li
                      key={reason}
                      className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-zinc-200"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>

                {/* Matched skills + gaps + vibe */}
                {(rec.matched_skills.length > 0 || rec.missing_role_fit.length > 0 || rec.vibe_match) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {rec.vibe_match ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-2 py-1 text-xs font-semibold text-pitch-100">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Vibe match
                      </span>
                    ) : null}
                    {rec.matched_skills.slice(0, 4).map((skill) => (
                      <span
                        key={`match-${skill}`}
                        className="inline-flex items-center gap-1 rounded-md border border-pitch-500/20 bg-pitch-500/[0.08] px-2 py-1 text-xs text-pitch-100"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {skill}
                      </span>
                    ))}
                    {rec.missing_role_fit.slice(0, 2).map((gap) => (
                      <span
                        key={`gap-${gap}`}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-400"
                      >
                        <CircleDashed className="h-3 w-3" aria-hidden="true" />
                        still needs {gap}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {rec.type === "team" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRequestJoin(rec)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-pitch-500 px-3 py-2 text-xs font-black text-pitch-950 hover:bg-pitch-100"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Request to join
                      </button>
                      <Link
                        href={teamHref}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]"
                      >
                        View club
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </>
                  ) : (
                    <>
                      {isTeamOwner ? (
                        <button
                          type="button"
                          onClick={() => handleInvite(rec)}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-pitch-500 px-3 py-2 text-xs font-black text-pitch-950 hover:bg-pitch-100"
                        >
                          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Invite to club
                        </button>
                      ) : null}
                      <Link
                        href={profileHref}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]"
                      >
                        View profile
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                  {acted ? <span className="text-xs font-semibold text-pitch-100">{acted}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
