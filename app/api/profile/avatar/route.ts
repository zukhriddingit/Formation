import { NextResponse } from "next/server";
import { AVATAR_BUCKET, avatarMimeExtensions, avatarPathBelongsToUser, avatarPathFromPublicUrl, MAX_AVATAR_BYTES } from "@/lib/profile/avatar";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthedUploadContext(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { error: NextResponse.json({ error: "Profile image service is not configured." }, { status: 503 }) };
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

async function ensureAvatarBucket(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error("Could not inspect profile image storage.");
  }

  if (buckets.some((bucket) => bucket.id === AVATAR_BUCKET)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: Object.keys(avatarMimeExtensions),
  });

  if (createError) {
    throw new Error("Could not create profile image storage.");
  }
}

export async function POST(request: Request) {
  const context = await getAuthedUploadContext(request);

  if (context.error) {
    return context.error;
  }

  const { supabase, user } = context;
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Could not read profile image upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const eventId = String(formData.get("eventId") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a profile image first." }, { status: 400 });
  }

  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "Invalid event for profile image upload." }, { status: 400 });
  }

  const extension = avatarMimeExtensions[file.type];

  if (!extension) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WebP profile image." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Profile image must be 2 MB or smaller." }, { status: 400 });
  }

  try {
    await ensureAvatarBucket(supabase);

    const path = `${eventId}/${user.id}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ avatar_url: publicUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload profile image." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const context = await getAuthedUploadContext(request);

  if (context.error) {
    return context.error;
  }

  const { supabase, user } = context;
  const payload = (await request.json().catch(() => ({}))) as { avatarUrl?: string };
  const path = avatarPathFromPublicUrl(payload.avatarUrl ?? null);

  if (!avatarPathBelongsToUser(path, user.id)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await supabase.storage.from(AVATAR_BUCKET).remove([path as string]);
  return NextResponse.json({ ok: true }, { status: 200 });
}
