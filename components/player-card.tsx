import { ExternalLink, Radio, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { RoleBadge } from "@/components/role-badge";
import { VibeBadge } from "@/components/vibe-badge";
import { profileShareUrl } from "@/lib/share";

export function PlayerCard({
  profile,
  compact = false,
  eventSlug,
}: {
  profile: Profile;
  compact?: boolean;
  eventSlug?: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-zinc-950/70 p-5 shadow-glow">
      <div className="flex items-start gap-4">
        <ProfileAvatar profile={profile} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white">{profile.name}</h3>
              <p className="mt-1 text-sm leading-5 text-zinc-400">{profile.headline ?? "Free agent"}</p>
            </div>
            <VibeBadge vibe={profile.vibe} />
          </div>
          {!compact && profile.bio ? <p className="mt-4 text-sm leading-6 text-zinc-300">{profile.bio}</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {profile.positions.slice(0, compact ? 2 : 4).map((position) => (
          <RoleBadge key={position}>{position}</RoleBadge>
        ))}
      </div>

      {!compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.skills.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className={cn("mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4", compact && "mt-4")}>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {profile.looking_for_team ? (
            <>
              <Radio className="h-3.5 w-3.5 text-pitch-500" aria-hidden="true" />
              Free agent
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-trophy-400" aria-hidden="true" />
              Team owner
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {eventSlug && !compact ? (
            <CopyButton
              value={profileShareUrl(eventSlug, profile.id)}
              label="Copy profile link"
              className="px-2.5 py-1 text-xs"
            />
          ) : null}
          {profile.linkedin_url ? (
            <Link href={profile.linkedin_url} className="focus-ring inline-flex items-center gap-1 rounded-md text-xs font-semibold text-zinc-300 hover:text-white">
              LinkedIn
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
