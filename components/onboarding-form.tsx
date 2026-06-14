"use client";

import { ClipboardCheck, FileUp, Loader2, Save, ShieldCheck, Sparkles, WandSparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import type { EventBoard, ExperienceLevel, ProfileExtraction, ScoutRecommendation, Vibe } from "@/lib/types";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";
import { recommendTeamsForSignals } from "@/lib/scout/scoring";
import { ScoutPanel } from "@/components/scout-panel";
import { cn } from "@/lib/utils";

const vibes: Vibe[] = ["serious", "chill", "beginner-friendly", "trying-to-win"];
const levels: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

type FormState = {
  name: string;
  email: string;
  headline: string;
  bio: string;
  skills: string[];
  positions: string[];
  interests: string[];
  wants_to_build: string;
  experience_level: ExperienceLevel;
  vibe: Vibe;
  looking_for_team: boolean;
  linkedin_url: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  headline: "",
  bio: "",
  skills: [],
  positions: [],
  interests: [],
  wants_to_build: "",
  experience_level: "intermediate",
  vibe: "trying-to-win",
  looking_for_team: true,
  linkedin_url: "",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function OnboardingForm({ eventSlug, board }: { eventSlug: string; board: EventBoard }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [profileText, setProfileText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<(ProfileExtraction & { mode?: string }) | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [recs, setRecs] = useState<ScoutRecommendation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAutofill = Boolean(file || profileText.trim() || linkedinUrl.trim());

  async function autofill() {
    if (!canAutofill) {
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    setSaved(false);
    track(ANALYTICS_EVENTS.PROFILE_AUTOFILL_STARTED, {
      event_slug: eventSlug,
      used_file: Boolean(file),
      used_text: Boolean(profileText.trim()),
      used_linkedin: Boolean(linkedinUrl.trim()),
    });

    try {
      const body = new FormData();
      if (file) body.append("file", file);
      if (profileText.trim()) body.append("text", profileText);
      if (linkedinUrl.trim()) body.append("linkedinUrl", linkedinUrl);

      const response = await fetch("/api/profile/extract", { method: "POST", body });
      const payload = (await response.json()) as ProfileExtraction & { mode?: string; error?: string };

      if (payload.error) {
        setExtractError(payload.error);
        return;
      }

      setExtraction(payload);
      track(ANALYTICS_EVENTS.PROFILE_AUTOFILL_COMPLETED, {
        event_slug: eventSlug,
        mode: payload.mode ?? "heuristic",
        confidence: payload.confidence,
        skills_count: payload.skills.length,
        positions_count: payload.positions.length,
      });
    } catch {
      setExtractError("Autofill failed. Paste your text or fill the card in manually.");
    } finally {
      setIsExtracting(false);
    }
  }

  function applyDraft() {
    if (!extraction) {
      return;
    }
    setForm((current) => ({
      ...current,
      name: extraction.name ?? current.name,
      email: extraction.email ?? current.email,
      headline: extraction.headline ?? current.headline,
      bio: extraction.bio ?? current.bio,
      skills: extraction.skills.length > 0 ? extraction.skills : current.skills,
      positions: extraction.positions.length > 0 ? extraction.positions : current.positions,
      interests: extraction.interests.length > 0 ? extraction.interests : current.interests,
      experience_level: extraction.experience_level ?? current.experience_level,
      linkedin_url: extraction.linkedin_url ?? current.linkedin_url,
    }));
  }

  function save() {
    setSaved(true);
    track(ANALYTICS_EVENTS.PROFILE_CREATED, {
      event_slug: eventSlug,
      positions_count: form.positions.length,
      skills_count: form.skills.length,
      vibe: form.vibe,
      looking_for_team: form.looking_for_team,
      autofilled: Boolean(extraction),
    });
    setRecs(
      recommendTeamsForSignals(board, {
        skills: form.skills,
        positions: form.positions,
        interests: form.interests,
        vibe: form.vibe,
        looking_for_team: form.looking_for_team,
      }),
    );
  }

  const confidencePct = extraction ? Math.round(extraction.confidence * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        {/* Editable card */}
        <form
          className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="Maya Chen"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="player@example.com"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Headline</span>
              <input
                value={form.headline}
                onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="Full-stack captain who ships polished demos"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Bio</span>
              <textarea
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                rows={3}
                className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="What do you bring to a hackathon team?"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Positions</span>
              <input
                value={form.positions.join(", ")}
                onChange={(event) => setForm((current) => ({ ...current, positions: splitList(event.target.value) }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="Frontend, Design"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Skills</span>
              <input
                value={form.skills.join(", ")}
                onChange={(event) => setForm((current) => ({ ...current, skills: splitList(event.target.value) }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="React, Supabase, Figma"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Interests</span>
              <input
                value={form.interests.join(", ")}
                onChange={(event) => setForm((current) => ({ ...current, interests: splitList(event.target.value) }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="AI agents, Fintech, Climate"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-300">Vibe</span>
              <select
                value={form.vibe}
                onChange={(event) => setForm((current) => ({ ...current, vibe: event.target.value as Vibe }))}
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
                value={form.experience_level}
                onChange={(event) => setForm((current) => ({ ...current, experience_level: event.target.value as ExperienceLevel }))}
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
              <span className="text-sm font-semibold text-zinc-300">LinkedIn URL (optional)</span>
              <input
                value={form.linkedin_url}
                onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))}
                className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="https://www.linkedin.com/in/your-handle"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-zinc-300">Wants to build</span>
              <textarea
                value={form.wants_to_build}
                onChange={(event) => setForm((current) => ({ ...current, wants_to_build: event.target.value }))}
                rows={2}
                className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
                placeholder="A fast, useful product idea for this weekend"
              />
            </label>
            <label className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.looking_for_team}
                onChange={(event) => setForm((current) => ({ ...current, looking_for_team: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-pitch-500"
              />
              <span className="text-sm text-zinc-300">I&apos;m a free agent looking for a club</span>
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
                Card saved for {eventSlug}
              </span>
            ) : null}
          </div>
        </form>

        {/* Autofill assist */}
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-trophy-400">Scout assist</p>
              <h2 className="mt-2 text-xl font-black text-white">Autofill my card</h2>
            </div>
            <WandSparkles className="h-5 w-5 text-trophy-400" aria-hidden="true" />
          </div>

          {/* Resume upload */}
          <div className="mt-5">
            <span className="text-sm font-semibold text-zinc-300">Resume (PDF, DOCX, or .txt)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            {file ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-ink-950/75 px-3 py-2 text-sm text-zinc-200">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="focus-ring rounded-md p-1 text-zinc-400 hover:text-white"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/15 bg-ink-950/60 px-3 py-3 text-sm font-semibold text-zinc-300 hover:border-white/30 hover:text-white"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload resume
              </button>
            )}
          </div>

          {/* Paste text */}
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-zinc-300">Or paste profile text</span>
            <textarea
              value={profileText}
              onChange={(event) => setProfileText(event.target.value)}
              rows={5}
              className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-ink-950/75 px-3 py-3 text-sm leading-6 text-white"
              placeholder="Paste a resume summary, intro, or LinkedIn-style profile text."
            />
          </label>

          {/* LinkedIn URL */}
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-zinc-300">LinkedIn URL (optional)</span>
            <input
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-ink-950/75 px-3 py-3 text-sm text-white"
              placeholder="https://www.linkedin.com/in/your-handle"
            />
            <span className="mt-1 block text-xs text-zinc-500">Stored as a link only — we never open or scrape LinkedIn.</span>
          </label>

          <button
            type="button"
            onClick={autofill}
            disabled={isExtracting || !canAutofill}
            className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {isExtracting ? "Reading your profile…" : "Autofill my card"}
          </button>

          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-zinc-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pitch-500" aria-hidden="true" />
            We use this only to draft your card. You can edit before saving — your resume text is never stored.
          </p>

          {extractError ? (
            <p className="mt-3 rounded-md border border-boot-400/30 bg-boot-400/10 px-3 py-2 text-sm text-boot-400">{extractError}</p>
          ) : null}

          {/* Preview */}
          {extraction ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-ink-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">Draft preview</p>
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-semibold",
                    confidencePct >= 60
                      ? "border-pitch-500/25 bg-pitch-500/10 text-pitch-100"
                      : "border-trophy-400/25 bg-trophy-400/10 text-trophy-100",
                  )}
                >
                  {confidencePct}% confidence
                </span>
              </div>

              <dl className="mt-3 space-y-1.5 text-sm">
                {extraction.name ? (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-zinc-500">Name</dt>
                    <dd className="text-zinc-200">{extraction.name}</dd>
                  </div>
                ) : null}
                {extraction.headline ? (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-zinc-500">Headline</dt>
                    <dd className="text-zinc-200">{extraction.headline}</dd>
                  </div>
                ) : null}
                {extraction.positions.length > 0 ? (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-zinc-500">Positions</dt>
                    <dd className="text-zinc-200">{extraction.positions.join(", ")}</dd>
                  </div>
                ) : null}
                {extraction.skills.length > 0 ? (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-zinc-500">Skills</dt>
                    <dd className="text-zinc-200">{extraction.skills.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>

              {extraction.notes.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                  {extraction.notes.slice(0, 4).map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                onClick={applyDraft}
                className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pitch-500 px-4 py-2.5 text-sm font-black text-pitch-950 hover:bg-pitch-100"
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Apply draft to form
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Post-save scout preview */}
      {saved ? (
        <ScoutPanel
          eventSlug={eventSlug}
          mode="teams_for_player"
          recommendations={recs}
          title="Clubs that fit your card"
          subtitle="Scout picks based on the card you just saved"
        />
      ) : null}
    </div>
  );
}
