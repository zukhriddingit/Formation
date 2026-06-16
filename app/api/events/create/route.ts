import { NextResponse } from "next/server";
import { isValidEventSlug, normalizeEventName, normalizeEventSlug, normalizeOrganizerEmail } from "@/lib/events";
import { eventColumns } from "@/lib/supabase/domain";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeOptionalText(value: unknown, maxLength = 120) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeStartsAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isMissingOwnerColumnError(error: { message?: string; details?: string; code?: string }) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.code === "PGRST204" || text.includes("owner_user_id");
}

function isDuplicateSlugError(error: { message?: string; code?: string }) {
  return error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate key");
}

async function getAuthedContext(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { error: NextResponse.json({ error: "Event creation is not configured." }, { status: 503 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: NextResponse.json({ error: "Missing Supabase session." }, { status: 401 }) };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Invalid Supabase session." }, { status: 401 }) };
  }

  return { supabase, user: data.user };
}

export async function POST(request: Request) {
  const context = await getAuthedContext(request);

  if (context.error) {
    return context.error;
  }

  const { supabase, user } = context;
  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    location?: string;
    starts_at?: string;
    organizer_email?: string;
  };

  const name = normalizeEventName(payload.name ?? "");
  const slug = normalizeEventSlug(payload.slug ?? name);
  const location = normalizeOptionalText(payload.location);
  const starts_at = normalizeStartsAt(payload.starts_at);
  const organizer_email = normalizeOrganizerEmail(payload.organizer_email ?? "");

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "Event name must be at least 3 characters." }, { status: 400 });
  }

  if (!isValidEventSlug(slug)) {
    return NextResponse.json({ error: "Use a slug like boston-ai-hack, 3-60 lowercase letters or numbers." }, { status: 400 });
  }

  const baseInsert = {
    name,
    slug,
    location,
    starts_at,
    organizer_email,
  };

  const insertWithOwner = {
    ...baseInsert,
    owner_user_id: user.id,
  };

  let result = await supabase.from("events").insert(insertWithOwner).select(eventColumns).single();

  if (result.error && isMissingOwnerColumnError(result.error)) {
    result = await supabase.from("events").insert(baseInsert).select(eventColumns).single();
  }

  if (result.error) {
    if (isDuplicateSlugError(result.error)) {
      return NextResponse.json({ error: "That event slug is already taken. Try a more specific one." }, { status: 409 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ event: result.data }, { status: 201 });
}
