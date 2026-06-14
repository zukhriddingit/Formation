import type { ExperienceLevel, Vibe } from "@/lib/types";

export const skillOptions = [
  "frontend",
  "backend",
  "ML",
  "design",
  "product",
  "pitch",
  "payments",
  "deployment",
  "data",
  "mobile",
] as const;

export const positionOptions = [
  "frontend",
  "backend",
  "AI/ML",
  "designer",
  "product",
  "pitch",
  "full-stack",
] as const;

export const vibeOptions: Vibe[] = ["serious", "chill", "beginner-friendly", "trying-to-win"];

export const experienceOptions: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export function normalizeMultiValue(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function splitTags(value: string) {
  return normalizeMultiValue(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}
