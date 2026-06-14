/**
 * Optional LLM polish for recommendation *explanations only*.
 * The recommendations themselves (which players/teams, and their scores) are
 * always produced by deterministic scoring — Nemotron only rewords the reasons.
 * Any failure returns the original reasons unchanged.
 */
import type { ScoutRecommendation } from "@/lib/types";
import { extractJsonObject, isNemotronConfigured, nemotronChat } from "@/lib/ai/nemotron";

const POLISH_SYSTEM_PROMPT = `You rewrite hackathon matchmaking explanations to be punchy, specific, and warm.
Keep every factual claim from the input — do not invent skills, roles, or vibes.
Return ONLY JSON of the form {"items":[{"id":string,"reasons":string[]}]}.
Each item: at most 3 reasons, each <= 70 characters, no emojis.`;

export async function polishRecommendations(
  recommendations: ScoutRecommendation[],
): Promise<{ recommendations: ScoutRecommendation[]; polished: boolean }> {
  if (!isNemotronConfigured() || recommendations.length === 0) {
    return { recommendations, polished: false };
  }

  const compact = recommendations.map((rec) => ({
    id: rec.id,
    title: rec.title,
    reasons: rec.reasons,
    matched_skills: rec.matched_skills,
    missing_role_fit: rec.missing_role_fit,
    vibe_match: rec.vibe_match,
  }));

  const raw = await nemotronChat(
    [
      { role: "system", content: POLISH_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ recommendations: compact }) },
    ],
    { temperature: 0.4, maxTokens: 600 },
  );

  const parsed = extractJsonObject<{ items?: Array<{ id?: string; reasons?: unknown }> }>(raw);

  if (!parsed?.items || !Array.isArray(parsed.items)) {
    return { recommendations, polished: false };
  }

  const byId = new Map<string, string[]>();
  for (const item of parsed.items) {
    if (typeof item.id === "string" && Array.isArray(item.reasons)) {
      const reasons = item.reasons
        .filter((reason): reason is string => typeof reason === "string" && reason.trim().length > 0)
        .map((reason) => reason.trim())
        .slice(0, 3);
      if (reasons.length > 0) {
        byId.set(item.id, reasons);
      }
    }
  }

  if (byId.size === 0) {
    return { recommendations, polished: false };
  }

  const merged = recommendations.map((rec) => {
    const polishedReasons = byId.get(rec.id);
    return polishedReasons ? { ...rec, reasons: polishedReasons } : rec;
  });

  return { recommendations: merged, polished: true };
}
