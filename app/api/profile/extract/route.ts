import { NextResponse } from "next/server";
import type { ExtractedProfileDraft, ExperienceLevel } from "@/lib/types";

const knownSkills = [
  "React",
  "Next.js",
  "TypeScript",
  "Supabase",
  "Postgres",
  "Python",
  "OpenAI",
  "NVIDIA NIM",
  "Nemotron",
  "Figma",
  "UX",
  "Stripe",
  "Node.js",
  "SQL",
  "Analytics",
  "PostHog",
  "React Native",
];

const knownPositions = ["Frontend", "Backend", "Full-stack", "Design", "Product", "AI/ML", "Data", "Mobile", "Infrastructure"];

function includesToken(text: string, token: string) {
  return text.toLowerCase().includes(token.toLowerCase());
}

function inferExperience(text: string): ExperienceLevel {
  if (/\b(senior|lead|advanced|staff|principal|5\+|6\+|7\+)\b/i.test(text)) {
    return "advanced";
  }

  if (/\b(beginner|first hackathon|new to|student)\b/i.test(text)) {
    return "beginner";
  }

  return "intermediate";
}

async function readProfileText(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return String(formData.get("text") ?? formData.get("profileText") ?? "");
  }

  const payload = (await request.json().catch(() => ({}))) as { text?: string; profileText?: string };
  return payload.text ?? payload.profileText ?? "";
}

export async function POST(request: Request) {
  const text = await readProfileText(request);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? "";
  const skills = knownSkills.filter((skill) => includesToken(text, skill)).slice(0, 8);
  const positions = knownPositions.filter((position) => includesToken(text, position)).slice(0, 4);

  const draft: ExtractedProfileDraft = {
    name: firstLine && firstLine.length <= 60 ? firstLine.replace(/^name:\s*/i, "") : "",
    headline: lines.find((line) => /engineer|designer|founder|builder|developer|student|product|data|ml|ai/i.test(line)) ?? "Hackathon player ready to join a club",
    bio: text ? text.slice(0, 280) : "Ready to build a focused demo with a balanced team.",
    skills: skills.length > 0 ? skills : ["TypeScript", "Product", "Pitch"],
    positions: positions.length > 0 ? positions : ["Full-stack", "Product"],
    interests: ["Hackathons", "AI", "Startups"],
    wants_to_build: lines.find((line) => /build|create|ship|make/i.test(line)) ?? "A useful product that can be demoed clearly by judging.",
    experience_level: inferExperience(text),
  };

  return NextResponse.json({
    draft,
    mode: process.env.NVIDIA_API_KEY ? "deterministic_stub_with_nemotron_ready" : "deterministic_stub",
    todo: "Replace this deterministic parser with resume file parsing and a NVIDIA Nemotron structured extraction call when ready.",
  });
}
