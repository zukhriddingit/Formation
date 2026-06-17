import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function loginRedirect(request: NextRequest, message: string, nextPath: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", nextPath);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNext(requestUrl.searchParams.get("next"));

  if (!code) {
    return loginRedirect(request, "Missing confirmation code. Please request a new sign-in link.", nextPath);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return loginRedirect(request, "Supabase is not configured for this environment.", nextPath);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginRedirect(request, "Could not confirm your email. Please request a new confirmation link.", nextPath);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
