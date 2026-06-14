/**
 * Resume / profile-text extraction.
 *
 * Two paths, same output shape (`ProfileExtraction`):
 *   1. Deterministic heuristics (always available, no network).
 *   2. NVIDIA Nemotron structured extraction (used only when NVIDIA_API_KEY is
 *      set, and always merged on top of heuristics so a flaky LLM never makes
 *      the result worse).
 *
 * Privacy: this module returns a *draft* only. Raw resume text is never returned
 * verbatim as the bio and is never persisted — callers must not store the input.
 */
import type { ExperienceLevel, ExtractedProfileDraft, ProfileExtraction } from "@/lib/types";
import { extractJsonObject, isNemotronConfigured, nemotronChat } from "@/lib/ai/nemotron";
import { uniqueStrings } from "@/lib/utils";

/** Positions the rest of the app understands. LLM output is snapped to this set. */
export const APP_POSITIONS = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Design",
  "Product",
  "AI/ML",
  "Data",
  "Mobile",
  "Infrastructure",
] as const;

/** Canonical skill -> aliases. A match on any alias records the canonical label. */
const SKILL_DICTIONARY: Record<string, string[]> = {
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs", "next js"],
  TypeScript: ["typescript", "ts"],
  JavaScript: ["javascript", "js", "es6"],
  "Node.js": ["node.js", "nodejs", "node js", "express"],
  Python: ["python", "django", "flask", "fastapi"],
  Go: ["golang", "go lang"],
  Rust: ["rust"],
  Java: ["java", "spring boot", "spring"],
  Swift: ["swift", "swiftui"],
  Kotlin: ["kotlin"],
  "C++": ["c++", "cpp"],
  Supabase: ["supabase"],
  Postgres: ["postgres", "postgresql"],
  MySQL: ["mysql"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  Firebase: ["firebase"],
  GraphQL: ["graphql"],
  Tailwind: ["tailwind", "tailwindcss"],
  Figma: ["figma"],
  UX: ["ux", "user experience"],
  UI: ["ui design", "ui/ux", "interface design"],
  Branding: ["brand", "branding", "visual identity"],
  Prototyping: ["prototyping", "prototype"],
  Stripe: ["stripe"],
  PyTorch: ["pytorch", "torch"],
  TensorFlow: ["tensorflow", "keras"],
  LLMs: ["llm", "large language model", "gpt", "prompt engineering"],
  Nemotron: ["nemotron", "nvidia nim", "nvidia"],
  OpenAI: ["openai"],
  LangChain: ["langchain"],
  Embeddings: ["embeddings", "vector search", "rag", "retrieval augmented"],
  "Computer Vision": ["computer vision", "opencv"],
  NLP: ["nlp", "natural language"],
  SQL: ["sql"],
  Analytics: ["analytics", "amplitude", "mixpanel", "ga4"],
  PostHog: ["posthog"],
  Pandas: ["pandas", "numpy"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  AWS: ["aws", "amazon web services", "lambda", "s3"],
  GCP: ["gcp", "google cloud"],
  Terraform: ["terraform"],
  "React Native": ["react native"],
  Flutter: ["flutter", "dart"],
  iOS: ["ios", "iphone"],
  Android: ["android"],
  Maps: ["mapbox", "google maps", "leaflet"],
  Animations: ["framer motion", "gsap", "animation"],
  Product: ["product management", "product manager", "roadmap", "product strategy"],
  Pitch: ["pitch", "storytelling", "presentation", "demo day"],
  "User Research": ["user research", "usability", "interviews"],
};

/** Position -> skills/keywords that imply it. */
const POSITION_SIGNALS: Record<(typeof APP_POSITIONS)[number], string[]> = {
  Frontend: ["React", "Next.js", "Tailwind", "JavaScript", "TypeScript", "UI", "Animations", "frontend", "front-end"],
  Backend: ["Node.js", "Python", "Go", "Rust", "Java", "Postgres", "SQL", "GraphQL", "Supabase", "backend", "back-end", "api"],
  "Full-stack": ["full stack", "full-stack", "fullstack"],
  Design: ["Figma", "UX", "UI", "Branding", "Prototyping", "designer", "design"],
  Product: ["Product", "Pitch", "User Research", "product manager", "pm"],
  "AI/ML": ["PyTorch", "TensorFlow", "LLMs", "Nemotron", "OpenAI", "Embeddings", "Computer Vision", "NLP", "machine learning", "ml engineer", "ai"],
  Data: ["SQL", "Analytics", "PostHog", "Pandas", "data scientist", "data analyst", "data engineer"],
  Mobile: ["React Native", "Flutter", "iOS", "Android", "Swift", "Kotlin", "mobile"],
  Infrastructure: ["Docker", "Kubernetes", "AWS", "GCP", "Terraform", "devops", "infrastructure", "sre"],
};

/** Interest / problem-space keywords. */
const INTEREST_SIGNALS: Record<string, string[]> = {
  "AI agents": ["ai agent", "autonomous agent", "agentic"],
  "AI tools": ["ai tool", "copilot", "genai", "generative ai"],
  "Developer tools": ["developer tools", "devtools", "dx", "sdk"],
  Fintech: ["fintech", "payments", "banking", "trading"],
  Health: ["health", "healthcare", "medical", "wellness", "fitness"],
  Climate: ["climate", "sustainability", "carbon", "clean energy"],
  Education: ["education", "edtech", "learning", "teaching"],
  "Consumer apps": ["consumer app", "social app", "mobile app"],
  Marketplaces: ["marketplace", "two-sided", "gig economy"],
  "Sports tech": ["sports", "soccer", "football", "athletics"],
  Gaming: ["gaming", "game dev", "unity", "unreal"],
  Security: ["security", "cybersecurity", "infosec", "pentest"],
  Robotics: ["robotics", "drones", "embedded"],
  Travel: ["travel", "tourism", "hospitality"],
  "Civic tech": ["civic", "government", "public sector"],
  "Ops tools": ["operations", "ops tool", "internal tool", "workflow"],
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LINKEDIN_RE = /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s)<>"']+/i;

/**
 * Whole-token match that respects tech punctuation (c++, c#, next.js) and a
 * trailing plural "s" (agent -> agents). Boundaries treat ./- as separators so
 * "fintech." and "Python," match, while still avoiding false positives like
 * "Java" in "JavaScript" or "ai" in "email"/"available".
 */
function matchesWord(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Leading boundary excludes "." so ".js" in "next.js" doesn't match the "js"
  // alias; trailing boundary allows "." so "fintech." / "Python." still match.
  const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}s?([^a-z0-9+#]|$)`, "i");
  return re.test(text);
}

function detectFromDictionary(text: string, dictionary: Record<string, string[]>) {
  const hits: string[] = [];

  for (const [canonical, aliases] of Object.entries(dictionary)) {
    if (aliases.some((alias) => matchesWord(text, alias))) {
      hits.push(canonical);
    }
  }

  return hits;
}

function inferPositions(text: string, skills: string[]): string[] {
  const skillSet = new Set(skills);
  const positions: string[] = [];

  for (const position of APP_POSITIONS) {
    const signals = POSITION_SIGNALS[position];
    const matched = signals.some((signal) => skillSet.has(signal) || matchesWord(text, signal));
    if (matched) {
      positions.push(position);
    }
  }

  // If they clearly do both frontend and backend, surface Full-stack first.
  if (positions.includes("Frontend") && positions.includes("Backend") && !positions.includes("Full-stack")) {
    positions.unshift("Full-stack");
  }

  return positions.slice(0, 4);
}

function inferExperience(text: string): { level: ExperienceLevel | null; signal: string | null } {
  // Numeric "N years" wins and is bucketed by the LARGEST count found (handles
  // "3 years ... 12 years total", "10+", "5-year veteran", multi-digit, etc.).
  const yearMatches = Array.from(text.matchAll(/(\d{1,3})\s*\+?\s*-?\s*years?/gi));
  if (yearMatches.length > 0) {
    const years = Math.max(...yearMatches.map((match) => Number.parseInt(match[1], 10)));
    if (years >= 5) {
      return { level: "advanced", signal: `${years}+ years of experience` };
    }
    if (years >= 1) {
      return { level: "intermediate", signal: `${years} years of experience` };
    }
  }
  if (/\b(senior|staff|principal|lead|architect|advanced)\b/i.test(text)) {
    return { level: "advanced", signal: "seniority keyword" };
  }
  if (/\b(beginner|first hackathon|new to|learning|student|freshman|sophomore|bootcamp)\b/i.test(text)) {
    return { level: "beginner", signal: "early-career keyword" };
  }
  if (/\b(mid-?level|intermediate)\b/i.test(text)) {
    return { level: "intermediate", signal: "mid-level keyword" };
  }
  return { level: null, signal: null };
}

function guessName(lines: string[], email: string | null): string | null {
  for (const raw of lines.slice(0, 4)) {
    const line = raw.replace(/^name:\s*/i, "").trim();
    if (!line || line.length > 48 || EMAIL_RE.test(line) || /https?:\/\//i.test(line)) {
      continue;
    }
    const words = line.split(/\s+/);
    const looksLikeName = words.length >= 1 && words.length <= 4 && /^[A-Za-z][A-Za-z'.-]*(\s+[A-Za-z][A-Za-z'.-]*)*$/.test(line);
    if (looksLikeName) {
      return line;
    }
  }
  // Last resort: derive a friendly name from the email local-part.
  if (email) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (local && /[a-z]/i.test(local)) {
      return local
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return null;
}

function synthesizeHeadline(lines: string[], positions: string[], skills: string[]): string | null {
  const roleLine = lines.find((line) =>
    /(engineer|developer|designer|founder|builder|scientist|manager|architect|student|lead)/i.test(line) && line.length <= 90,
  );
  if (roleLine) {
    return roleLine.trim();
  }
  if (positions.length > 0) {
    const top = positions[0];
    const tail = skills.slice(0, 2).join(" & ");
    return tail ? `${top} player fluent in ${tail}` : `${top} player ready for kickoff`;
  }
  return null;
}

function synthesizeBio(positions: string[], skills: string[], level: ExperienceLevel | null, interests: string[]): string | null {
  const parts: string[] = [];
  const role = positions.slice(0, 2).join(" / ");
  if (role) {
    parts.push(`${level ? `${level.charAt(0).toUpperCase()}${level.slice(1)} ` : ""}${role} player`.trim());
  }
  if (skills.length > 0) {
    parts.push(`strong in ${skills.slice(0, 4).join(", ")}`);
  }
  if (interests.length > 0) {
    parts.push(`drawn to ${interests.slice(0, 3).join(", ")}`);
  }
  if (parts.length === 0) {
    return null;
  }
  // Drafted summary — NOT raw resume text.
  return `${parts.join("; ")}.`.replace(/^(\w)/, (m) => m.toUpperCase());
}

/** Deterministic extraction. Always returns a usable draft. */
export function heuristicExtract({ text, linkedinUrl }: { text: string; linkedinUrl?: string | null }): ProfileExtraction {
  const cleaned = text ?? "";
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const email = cleaned.match(EMAIL_RE)?.[0] ?? null;
  const skills = uniqueStrings(detectFromDictionary(cleaned, SKILL_DICTIONARY)).slice(0, 10);
  const positions = inferPositions(cleaned, skills);
  const interests = uniqueStrings(detectFromDictionary(cleaned, INTEREST_SIGNALS)).slice(0, 6);
  const { level, signal } = inferExperience(cleaned);
  const name = guessName(lines, email);
  const headline = synthesizeHeadline(lines, positions, skills);
  const bio = synthesizeBio(positions, skills, level, interests);
  const linkedin = linkedinUrl?.trim() || cleaned.match(LINKEDIN_RE)?.[0] || null;

  const notes: string[] = [];
  if (!cleaned.trim()) {
    notes.push("No text was provided — fill the card in manually.");
  }
  if (skills.length > 0) {
    notes.push(`Detected ${skills.length} skill${skills.length === 1 ? "" : "s"} from keywords.`);
  } else if (cleaned.trim()) {
    notes.push("No known skills matched — add yours below.");
  }
  if (!email && cleaned.trim()) {
    notes.push("No email found — add one before saving.");
  }
  if (signal) {
    notes.push(`Experience level inferred from a ${signal}.`);
  }
  if (linkedin) {
    notes.push("LinkedIn is stored as a link only — the page was never fetched.");
  }

  // Confidence: starts low for heuristics, grows with how much signal we found.
  let confidence = 0.25;
  if (name) confidence += 0.12;
  if (email) confidence += 0.1;
  if (skills.length >= 3) confidence += 0.18;
  else if (skills.length > 0) confidence += 0.08;
  if (positions.length > 0) confidence += 0.12;
  if (level) confidence += 0.05;
  confidence = Math.min(Math.round(confidence * 100) / 100, 0.85);

  return {
    name,
    email,
    headline,
    bio,
    skills,
    positions,
    interests,
    experience_level: level,
    linkedin_url: linkedin,
    confidence,
    notes,
  };
}

function asStringArray(value: unknown, cap = 12): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value.map((item) => (typeof item === "string" ? item : String(item ?? "")))).slice(0, cap);
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function snapPositions(positions: string[], text: string): string[] {
  const snapped = new Set<string>();
  for (const position of positions) {
    const direct = APP_POSITIONS.find((allowed) => allowed.toLowerCase() === position.toLowerCase());
    if (direct) {
      snapped.add(direct);
      continue;
    }
    // Map free-form labels ("React developer") back into the app's vocabulary.
    for (const inferred of inferPositions(`${position} ${text}`, [])) {
      snapped.add(inferred);
    }
  }
  return Array.from(snapped).slice(0, 4);
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured hackathon player profiles from resume or profile text.
Return ONLY a JSON object, no prose, with exactly these keys:
{
  "name": string|null,
  "email": string|null,
  "headline": string|null,         // <= 90 chars, punchy
  "bio": string|null,              // 1-2 sentences you write yourself, never copy raw text
  "skills": string[],              // concrete technologies/abilities
  "positions": string[],           // choose from: Frontend, Backend, Full-stack, Design, Product, AI/ML, Data, Mobile, Infrastructure
  "interests": string[],           // problem spaces they care about
  "experience_level": "beginner"|"intermediate"|"advanced"|null,
  "confidence": number,            // 0..1, your confidence in this extraction
  "notes": string[]                // short notes about assumptions or gaps
}
Never invent contact details. Never fetch URLs.`;

/**
 * Full extraction pipeline: deterministic heuristics, then (when configured)
 * Nemotron layered on top. Returns a clean, sanitized `ProfileExtraction`.
 */
export async function extractProfile({
  text,
  linkedinUrl,
}: {
  text: string;
  linkedinUrl?: string | null;
}): Promise<{ extraction: ProfileExtraction; mode: "nemotron" | "heuristic" }> {
  const heuristic = heuristicExtract({ text, linkedinUrl });

  if (!isNemotronConfigured() || !text.trim()) {
    return { extraction: heuristic, mode: "heuristic" };
  }

  const raw = await nemotronChat(
    [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: `Profile text:\n"""\n${text.slice(0, 6000)}\n"""` },
    ],
    { temperature: 0.1, maxTokens: 600 },
  );

  const parsed = extractJsonObject<Partial<ProfileExtraction>>(raw);

  if (!parsed) {
    // LLM failed or returned junk — heuristics already gave us a good draft.
    return {
      extraction: { ...heuristic, notes: [...heuristic.notes, "AI extraction was unavailable; used keyword heuristics."] },
      mode: "heuristic",
    };
  }

  // Merge: prefer the LLM's richer text fields, but keep heuristics as a backstop
  // and always re-detect positions against the app vocabulary.
  const skills = asStringArray(parsed.skills).length > 0 ? asStringArray(parsed.skills) : heuristic.skills;
  const positions = snapPositions(asStringArray(parsed.positions), text);
  const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;

  // Validate the model's email against the regex; otherwise fall back to the
  // email actually found in the source text (never trust a hallucinated address).
  const llmEmail = asNullableString(parsed.email);
  const validatedEmail = llmEmail && EMAIL_RE.test(llmEmail) ? llmEmail : heuristic.email;

  const extraction: ProfileExtraction = {
    name: asNullableString(parsed.name) ?? heuristic.name,
    email: validatedEmail,
    headline: asNullableString(parsed.headline) ?? heuristic.headline,
    bio: asNullableString(parsed.bio) ?? heuristic.bio,
    skills,
    positions: positions.length > 0 ? positions : heuristic.positions,
    interests: asStringArray(parsed.interests).length > 0 ? asStringArray(parsed.interests) : heuristic.interests,
    experience_level: ["beginner", "intermediate", "advanced"].includes(String(parsed.experience_level))
      ? (parsed.experience_level as ExperienceLevel)
      : heuristic.experience_level,
    // LinkedIn is always taken from the user-provided link, never the model.
    linkedin_url: heuristic.linkedin_url,
    confidence: Math.min(Math.max(confidenceRaw, 0), 0.99),
    notes: [...asStringArray(parsed.notes, 6), "Drafted with NVIDIA Nemotron — review before saving."],
  };

  return { extraction, mode: "nemotron" };
}

/** Map the rich extraction into the onboarding form's editable draft state. */
export function extractionToDraft(extraction: ProfileExtraction): ExtractedProfileDraft {
  return {
    name: extraction.name ?? "",
    headline: extraction.headline ?? "",
    bio: extraction.bio ?? "",
    skills: extraction.skills,
    positions: extraction.positions,
    interests: extraction.interests,
    wants_to_build: "",
    experience_level: extraction.experience_level ?? "intermediate",
  };
}
