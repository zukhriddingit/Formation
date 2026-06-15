/* eslint-disable @next/next/no-img-element */
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
} as const;

export function ProfileAvatar({
  profile,
  size = "md",
  className,
}: {
  profile: Pick<Profile, "name" | "avatar_url">;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-pitch-500/25 bg-pitch-500/12 font-black text-pitch-100",
        sizeClasses[size],
        className,
      )}
    >
      <span>{initials(profile.name)}</span>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
