"use client";

import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "reset";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => safeNext(searchParams.get("next")), [searchParams]);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function replaceAnonymousSessionIfNeeded() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && ((user as typeof user & { is_anonymous?: boolean }).is_anonymous || !user.email)) {
      await supabase.auth.signOut();
    }

    return supabase;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = await replaceAnonymousSessionIfNeeded();

      if (!supabase) {
        setError("Supabase is not configured for this environment.");
        return;
      }

      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`,
        });

        if (resetError) {
          throw resetError;
        }

        setNotice("Password reset email sent. Check your inbox for the secure link.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          throw signInError;
        }

        router.push(nextPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${nextPath}`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setNotice("Account created. Check your email to confirm it before signing in.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueAsGuest() {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setError("Supabase is not configured for this environment.");
        return;
      }

      const { error: guestError } = await supabase.auth.signInAnonymously();

      if (guestError) {
        throw guestError;
      }

      router.push(nextPath);
      router.refresh();
    } catch (guestError) {
      setError(guestError instanceof Error ? guestError.message : "Could not continue as guest.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "signin" ? "Sign in to Formation" : mode === "signup" ? "Create your account" : "Reset your password";
  const actionText = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email";

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
      <div className="flex items-start gap-3 border-b border-white/10 pb-5">
        <span className="rounded-md border border-pitch-500/25 bg-pitch-500/10 p-2 text-pitch-100">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Account access</p>
          <h1 className="mt-1 text-2xl font-black text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Use email login for a persistent organizer or participant account.</p>
        </div>
      </div>

      {notice ? <p className="mt-5 rounded-md border border-pitch-500/25 bg-pitch-500/10 p-3 text-sm text-pitch-100">{notice}</p> : null}
      {error ? <p className="mt-5 rounded-md border border-boot-400/30 bg-boot-400/10 p-3 text-sm text-boot-400">{error}</p> : null}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold text-zinc-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
            placeholder="you@example.com"
          />
        </label>

        {mode !== "reset" ? (
          <label className="block text-sm font-semibold text-zinc-300">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white"
              placeholder="At least 6 characters"
            />
          </label>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-pitch-500 px-4 py-3 text-sm font-black text-pitch-950 transition hover:bg-pitch-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          {actionText}
        </button>
      </form>

      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="focus-ring rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 font-bold text-white hover:bg-white/[0.1]"
        >
          {mode === "signin" ? "Create account" : "Sign in instead"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "reset" ? "signin" : "reset")}
          className="focus-ring rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 font-bold text-white hover:bg-white/[0.1]"
        >
          {mode === "reset" ? "Back to sign in" : "Forgot password"}
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={isSubmitting}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.1] disabled:opacity-60"
        >
          Continue as guest
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="mt-3 text-xs leading-5 text-zinc-500">Guest mode is still available for fast QR onboarding. Email login is better for organizers and returning teammates.</p>
      </div>

      <Link href={nextPath} className="focus-ring mt-5 inline-flex rounded-md text-sm font-bold text-pitch-100 hover:text-white">
        Back to Formation
      </Link>
    </div>
  );
}
