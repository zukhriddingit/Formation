"use client";

import { ClipboardCheck, Loader2, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ExtractedProfileDraft, ExperienceLevel, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

const vibes: Vibe[] = ["serious", "chill", "beginner-friendly", "trying-to-win"];
const levels: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

const emptyDraft: ExtractedProfileDraft = {
  name: "",
  headline: "",
  bio: "",
  skills: [],
  positions: [],
  interests: [],
  wants_to_build: "",
  experience_level: "intermediate",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function OnboardingForm({ eventSlug }: { eventSlug: string }) {
  const [draft, setDraft] = useState<ExtractedProfileDraft>(emptyDraft);
  const [vibe, setVibe] = useState<Vibe>("trying-to-win");
  const [profileText, setProfileText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function extractProfile() {
    setIsExtracting(true);
    setSaved(false);

    try {
      const response = await fetch("/api/profile/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: profileText }),
      });
      const payload = (await response.json()) as { draft?: ExtractedProfileDraft };

      if (payload.draft) {
        setDraft(payload.draft);
      }
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
      <form
        className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="Maya Chen"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Email</span>
            <input
              type="email"
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="player@example.com"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Headline</span>
            <input
              value={draft.headline}
              onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="Full-stack captain who ships polished demos"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Bio</span>
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              rows={4}
              className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="What do you bring to a hackathon team?"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Positions</span>
            <input
              value={draft.positions.join(", ")}
              onChange={(event) => setDraft((current) => ({ ...current, positions: splitList(event.target.value) }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="Frontend, Design"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Skills</span>
            <input
              value={draft.skills.join(", ")}
              onChange={(event) => setDraft((current) => ({ ...current, skills: splitList(event.target.value) }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="React, Supabase, Figma"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Vibe</span>
            <select
              value={vibe}
              onChange={(event) => setVibe(event.target.value as Vibe)}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
            >
              {vibes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Experience</span>
            <select
              value={draft.experience_level}
              onChange={(event) => setDraft((current) => ({ ...current, experience_level: event.target.value as ExperienceLevel }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
            >
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Wants to build</span>
            <textarea
              value={draft.wants_to_build}
              onChange={(event) => setDraft((current) => ({ ...current, wants_to_build: event.target.value }))}
              rows={3}
              className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="A fast, useful product idea for this weekend"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save player card
          </button>
          {saved ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-pitch-100">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Demo card ready for {eventSlug}
            </span>
          ) : null}
        </div>
      </form>

      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-trophy-400">Scout assist</p>
            <h2 className="mt-2 text-xl font-black text-white">Draft from profile text</h2>
          </div>
          <Sparkles className="h-5 w-5 text-trophy-400" aria-hidden="true" />
        </div>
        <textarea
          value={profileText}
          onChange={(event) => setProfileText(event.target.value)}
          rows={8}
          className="focus-ring mt-5 w-full resize-none rounded-md border border-white/10 bg-ink-950/75 px-3 py-3 text-sm leading-6 text-white"
          placeholder="Paste a resume summary, intro, or LinkedIn-style profile text."
        />
        <button
          type="button"
          onClick={extractProfile}
          disabled={isExtracting}
          className={cn(
            "focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          Draft card
        </button>
      </div>
    </div>
  );
}
