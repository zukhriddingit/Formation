"use client";

import { ClipboardCheck, Loader2, Save, Sparkles, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { experienceOptions, positionOptions, skillOptions, splitTags, vibeOptions } from "@/lib/options";
import { captureClientEvent } from "@/lib/posthog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadCurrentProfile, loadEventBySlug, ownProfileColumns } from "@/lib/supabase/domain";
import type { EventRecord, ExperienceLevel, ExtractedProfileDraft, Profile, ProfileExtraction, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProfileFormState = {
  name: string;
  email: string;
  linkedin_url: string;
  headline: string;
  bio: string;
  skills: string[];
  positions: string[];
  interestsText: string;
  wants_to_build: string;
  has_idea: boolean;
  looking_for_team: boolean;
  vibe: Vibe;
  experience_level: ExperienceLevel;
};

type ExtractResponse = Partial<ProfileExtraction> & {
  draft?: ExtractedProfileDraft;
  error?: string;
  wants_to_build?: string | null;
};

const emptyForm: ProfileFormState = {
  name: "",
  email: "",
  linkedin_url: "",
  headline: "",
  bio: "",
  skills: [],
  positions: [],
  interestsText: "",
  wants_to_build: "",
  has_idea: false,
  looking_for_team: true,
  vibe: "trying-to-win",
  experience_level: "intermediate",
};

function formFromProfile(profile: Profile | null): ProfileFormState {
  if (!profile) {
    return emptyForm;
  }

  return {
    name: profile.name,
    email: profile.email ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills,
    positions: profile.positions,
    interestsText: profile.interests.join(", "),
    wants_to_build: profile.wants_to_build ?? "",
    has_idea: profile.has_idea,
    looking_for_team: profile.looking_for_team,
    vibe: profile.vibe ?? "trying-to-win",
    experience_level: profile.experience_level ?? "intermediate",
  };
}

function mergeDraft(current: ProfileFormState, draft: ExtractedProfileDraft | Partial<ProfileExtraction> & { wants_to_build?: string | null }): ProfileFormState {
  return {
    ...current,
    name: draft.name || current.name,
    email: "email" in draft ? draft.email || current.email : current.email,
    linkedin_url: "linkedin_url" in draft ? draft.linkedin_url || current.linkedin_url : current.linkedin_url,
    headline: draft.headline || current.headline,
    bio: draft.bio || current.bio,
    skills: draft.skills && draft.skills.length > 0 ? draft.skills : current.skills,
    positions: draft.positions && draft.positions.length > 0 ? draft.positions : current.positions,
    interestsText: draft.interests && draft.interests.length > 0 ? draft.interests.join(", ") : current.interestsText,
    wants_to_build: draft.wants_to_build || current.wants_to_build,
    experience_level: draft.experience_level ?? current.experience_level,
  };
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function extractDraft(payload: ExtractResponse) {
  if ("draft" in payload && payload.draft) {
    return payload.draft;
  }

  if (
    payload.name ||
    payload.headline ||
    payload.bio ||
    payload.email ||
    payload.linkedin_url ||
    payload.wants_to_build ||
    (payload.skills && payload.skills.length > 0) ||
    (payload.positions && payload.positions.length > 0) ||
    (payload.interests && payload.interests.length > 0)
  ) {
    return payload;
  }

  return null;
}

export function OnboardingForm({
  eventSlug,
  initialEvent,
}: {
  eventSlug: string;
  initialEvent: EventRecord;
}) {
  const router = useRouter();
  const [eventRecord, setEventRecord] = useState<EventRecord>(initialEvent);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [profileText, setProfileText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isReadOnlyDemo = !supabase;

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!supabase) {
        setIsLoading(false);
        setError("Supabase is not configured. This demo page is read-only until environment variables are set.");
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

        const loadedEvent = await loadEventBySlug(supabase, eventSlug);

        if (!loadedEvent) {
          throw new Error("This event does not exist.");
        }

        const loadedProfile = await loadCurrentProfile(supabase, loadedEvent.id, user);

        if (!active) {
          return;
        }

        setEventRecord(loadedEvent);
        setProfile(loadedProfile);
        setForm(formFromProfile(loadedProfile));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your player card.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [eventSlug, supabase]);

  async function extractProfile() {
    setIsExtracting(true);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: profileText, linkedinUrl: form.linkedin_url }),
      });
      const payload = (await response.json()) as ExtractResponse;

      if (payload.error) {
        setError(payload.error);
        return;
      }

      const draft = extractDraft(payload);

      if (draft) {
        setForm((current) => mergeDraft(current, draft));
        setNotice("Draft applied. Review it before saving.");
      } else {
        setNotice("No draft fields were found. You can still fill the card manually.");
      }
    } catch {
      setError("Could not draft the player card. Paste profile text and try again.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (!supabase) {
      setError("Supabase is not configured, so this player card cannot be saved yet.");
      return;
    }

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("No Supabase session found. Refresh and try again.");
      }

      const payload = {
        event_id: eventRecord.id,
        user_id: user.id,
        name: form.name.trim(),
        email: form.email.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        skills: form.skills,
        positions: form.positions,
        interests: splitTags(form.interestsText),
        wants_to_build: form.wants_to_build.trim() || null,
        has_idea: form.has_idea,
        looking_for_team: form.looking_for_team,
        vibe: form.vibe,
        experience_level: form.experience_level,
      };

      const { data, error: saveError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "event_id,user_id" })
        .select(ownProfileColumns)
        .single();

      if (saveError) {
        throw saveError;
      }

      setProfile(data as Profile);
      await captureClientEvent(profile ? "player_card_updated" : "player_card_created", { eventSlug });
      router.replace(`/e/${eventSlug}/board`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your player card.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
      <form className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow" onSubmit={saveProfile}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {profile ? "Edit player card" : "Create player card"}
            </p>
            <h2 className="mt-2 text-xl font-black text-white">{eventRecord.name}</h2>
          </div>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-pitch-100" aria-hidden="true" /> : null}
        </div>

        {error ? (
          <div className="mt-5 flex gap-3 rounded-md border border-boot-400/30 bg-boot-400/10 p-3 text-sm text-boot-400">
            <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 flex gap-3 rounded-md border border-pitch-500/25 bg-pitch-500/10 p-3 text-sm text-pitch-100">
            <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{notice}</p>
          </div>
        ) : null}

        <fieldset disabled={isLoading || isSaving || isReadOnlyDemo} className="mt-5 grid gap-4 disabled:opacity-70 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Name</span>
            <input
              value={form.name}
              onChange={(inputEvent) => setForm((current) => ({ ...current, name: inputEvent.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="Maya Chen"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(inputEvent) => setForm((current) => ({ ...current, email: inputEvent.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="player@example.com"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">LinkedIn URL</span>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(inputEvent) => setForm((current) => ({ ...current, linkedin_url: inputEvent.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="https://www.linkedin.com/in/..."
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Headline</span>
            <input
              value={form.headline}
              onChange={(inputEvent) => setForm((current) => ({ ...current, headline: inputEvent.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="Full-stack captain who ships polished demos"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Bio</span>
            <textarea
              value={form.bio}
              onChange={(inputEvent) => setForm((current) => ({ ...current, bio: inputEvent.target.value }))}
              rows={4}
              className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="What do you bring to a hackathon team?"
            />
          </label>

          <div className="md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Skills</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, skills: toggleValue(current.skills, skill) }))}
                  className={cn(
                    "focus-ring rounded-md border px-3 py-2 text-sm font-semibold",
                    form.skills.includes(skill)
                      ? "border-pitch-500/35 bg-pitch-500/15 text-pitch-100"
                      : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]",
                  )}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Positions</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {positionOptions.map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, positions: toggleValue(current.positions, position) }))}
                  className={cn(
                    "focus-ring rounded-md border px-3 py-2 text-sm font-semibold",
                    form.positions.includes(position)
                      ? "border-trophy-400/35 bg-trophy-400/15 text-trophy-100"
                      : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]",
                  )}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-zinc-300">Vibe</span>
            <select
              value={form.vibe}
              onChange={(inputEvent) => setForm((current) => ({ ...current, vibe: inputEvent.target.value as Vibe }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white"
            >
              {vibeOptions.map((item) => (
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
              onChange={(inputEvent) => setForm((current) => ({ ...current, experience_level: inputEvent.target.value as ExperienceLevel }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white"
            >
              {experienceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Interests / tags</span>
            <input
              value={form.interestsText}
              onChange={(inputEvent) => setForm((current) => ({ ...current, interestsText: inputEvent.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="AI agents, fintech, events"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-zinc-300">Wants to build</span>
            <textarea
              value={form.wants_to_build}
              onChange={(inputEvent) => setForm((current) => ({ ...current, wants_to_build: inputEvent.target.value }))}
              rows={3}
              className="focus-ring mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="A fast, useful product idea for this weekend"
            />
          </label>

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-zinc-300">
              <input
                type="checkbox"
                checked={form.has_idea}
                onChange={(inputEvent) => setForm((current) => ({ ...current, has_idea: inputEvent.target.checked }))}
                className="h-4 w-4 accent-pitch-500"
              />
              I have an idea to pitch
            </label>
            <label className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-zinc-300">
              <input
                type="checkbox"
                checked={form.looking_for_team}
                onChange={(inputEvent) => setForm((current) => ({ ...current, looking_for_team: inputEvent.target.checked }))}
                className="h-4 w-4 accent-pitch-500"
              />
              Looking for a team
            </label>
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isLoading || isSaving || isReadOnlyDemo}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Save player card
          </button>
          {profile ? <span className="text-sm text-zinc-400">Editing your existing card.</span> : null}
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
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Paste profile or resume text to draft fields. Nothing is saved until you submit the player card.
        </p>
        <textarea
          value={profileText}
          onChange={(inputEvent) => setProfileText(inputEvent.target.value)}
          rows={8}
          className="focus-ring mt-5 w-full resize-none rounded-md border border-white/10 bg-ink-950/75 px-3 py-3 text-sm leading-6 text-white"
          placeholder="Paste a short intro or profile summary."
        />
        <button
          type="button"
          onClick={extractProfile}
          disabled={isExtracting || !profileText.trim()}
          className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-trophy-400 px-4 py-3 text-sm font-black text-ink-950 hover:bg-trophy-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          Draft card
        </button>
      </div>
    </div>
  );
}
