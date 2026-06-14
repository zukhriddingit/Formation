import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-lg border border-white/10 bg-zinc-950/75 p-8 text-center shadow-glow">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-pitch-500/25 bg-pitch-500/10 text-pitch-100">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-4xl font-black text-white">Organizer premium is active</h1>
        <p className="mt-4 text-lg leading-8 text-zinc-300">
          Stripe Checkout completed in test mode. The webhook route is ready to mark event premium access when connected.
        </p>
        <Link
          href="/e/world-cup-hack/admin"
          className="focus-ring mt-8 inline-flex items-center gap-2 rounded-md bg-pitch-500 px-5 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
        >
          Return to dashboard
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
