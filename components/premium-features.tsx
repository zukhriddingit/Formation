"use client";

import { BarChart3, Download, Lock, Megaphone, Sparkles } from "lucide-react";
import type { ExperienceLevel, Team, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

type TeamRow = { team: Team; memberCount: number };

// Narrowed player shape — no email/bio/linkedin reaches the client payload.
export type PlayerExportRow = {
  name: string;
  headline: string | null;
  positions: string[];
  skills: string[];
  vibe: Vibe | null;
  experience_level: ExperienceLevel | null;
  looking_for_team: boolean;
};

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs font-semibold text-zinc-400">
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      Pro
    </span>
  );
}

export function PremiumFeatures({
  eventSlug,
  eventName,
  isPremium,
  players,
  teams,
}: {
  eventSlug: string;
  eventName: string;
  isPremium: boolean;
  players: PlayerExportRow[];
  teams: TeamRow[];
}) {
  function exportPlayersCsv() {
    if (!isPremium) {
      return;
    }
    const header = ["Name", "Headline", "Positions", "Skills", "Vibe", "Experience", "Looking for team"];
    const rows = players.map((p) => [
      p.name,
      p.headline ?? "",
      (p.positions ?? []).join(" / "),
      (p.skills ?? []).join(" / "),
      p.vibe ?? "",
      p.experience_level ?? "",
      p.looking_for_team ? "yes" : "no",
    ]);
    download(`${eventSlug}-players.csv`, toCsv([header, ...rows]));
  }

  // Advanced matching report: which positions are most in-demand across clubs.
  const roleDemand = new Map<string, number>();
  for (const { team } of teams) {
    for (const role of team.roles_needed ?? []) {
      roleDemand.set(role, (roleDemand.get(role) ?? 0) + 1);
    }
  }
  const topRoles = Array.from(roleDemand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalSlots = teams.reduce((sum, { team }) => sum + team.max_size, 0);
  const filledSlots = teams.reduce((sum, { memberCount }) => sum + memberCount, 0);
  const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-trophy-400" aria-hidden="true" />
          <h2 className="text-xl font-black text-white">Pro dashboard</h2>
        </div>
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-semibold",
            isPremium ? "border-pitch-500/30 bg-pitch-500/10 text-pitch-100" : "border-white/10 bg-white/[0.05] text-zinc-400",
          )}
        >
          {isPremium ? "Active" : "Locked"}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {/* CSV export */}
        <div className={cn("rounded-md border border-white/10 bg-zinc-950/70 p-4", !isPremium && "opacity-70")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-pitch-500" aria-hidden="true" />
              <p className="font-bold text-white">Export players CSV</p>
            </div>
            {!isPremium ? <LockedBadge /> : null}
          </div>
          <p className="mt-2 text-sm text-zinc-400">Download every player card with positions, skills, and availability.</p>
          <button
            type="button"
            onClick={exportPlayersCsv}
            disabled={!isPremium}
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-pitch-500 px-3 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isPremium ? `Export ${players.length} players` : "Unlock to export"}
          </button>
        </div>

        {/* Advanced matching report */}
        <div className={cn("rounded-md border border-white/10 bg-zinc-950/70 p-4", !isPremium && "opacity-70")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-trophy-400" aria-hidden="true" />
              <p className="font-bold text-white">Advanced matching report</p>
            </div>
            {!isPremium ? <LockedBadge /> : null}
          </div>
          {isPremium ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-400">
                Roster fill rate: <span className="font-bold text-white">{fillRate}%</span> · most-needed positions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topRoles.length > 0 ? (
                  topRoles.map(([role, count]) => (
                    <span key={role} className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-zinc-200">
                      {role} ×{count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No open roles posted yet.</span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">Role demand, fill rates, and balance gaps across every club.</p>
          )}
        </div>

        {/* Sponsor branding */}
        <div className={cn("rounded-md border border-white/10 bg-zinc-950/70 p-4", !isPremium && "opacity-70")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-boot-400" aria-hidden="true" />
              <p className="font-bold text-white">Sponsor branding</p>
            </div>
            {!isPremium ? <LockedBadge /> : null}
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {isPremium
              ? `Add your sponsor's logo and colors to the ${eventName} board and share cards.`
              : "Co-brand the board and share cards with your event sponsor."}
          </p>
          {isPremium ? (
            <div className="mt-3 flex h-16 items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.03] text-xs text-zinc-500">
              Drop sponsor logo here
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
