import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { NavActions } from "@/components/nav-actions";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring rounded-md text-xl font-black text-white">
            Formation
          </Link>
          <NavActions />
        </nav>

        <section className="grid gap-8 py-12 lg:grid-cols-[1fr_440px] lg:items-start">
          <div className="max-w-2xl">
            <p className="inline-flex items-center rounded-md border border-pitch-500/25 bg-pitch-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pitch-100">
              Secure workspace
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] text-white sm:text-7xl">Formation accounts</h1>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              Sign in to keep your organizer boards, player cards, teams, and requests tied to a persistent account. Guests can still join an event quickly from a QR code.
            </p>
          </div>

          <Suspense
            fallback={<div className="h-[520px] animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" aria-hidden="true" />}
          >
            <AuthForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
