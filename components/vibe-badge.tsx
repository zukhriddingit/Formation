import { Flame, Handshake, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vibe } from "@/lib/types";

const vibeStyles: Record<Vibe, string> = {
  serious: "border-boot-400/35 bg-boot-400/10 text-boot-400",
  chill: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  "beginner-friendly": "border-pitch-500/35 bg-pitch-500/10 text-pitch-100",
  "trying-to-win": "border-trophy-400/35 bg-trophy-400/10 text-trophy-100",
};

const vibeIcons = {
  serious: ShieldCheck,
  chill: Handshake,
  "beginner-friendly": Flame,
  "trying-to-win": Trophy,
} satisfies Record<Vibe, typeof Trophy>;

export function VibeBadge({
  vibe,
  className,
}: {
  vibe: Vibe | null;
  className?: string;
}) {
  if (!vibe) {
    return null;
  }

  const Icon = vibeIcons[vibe];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold",
        vibeStyles[vibe],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {vibe}
    </span>
  );
}
