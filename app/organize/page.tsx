import { ArrowLeft, QrCode, Radio, Share2, UsersRound } from "lucide-react";
import Link from "next/link";
import { OrganizeEventForm } from "@/components/organize-event-form";

export const dynamic = "force-dynamic";

export default function OrganizePage() {
  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Formation
        </Link>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_480px] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
              <Radio className="h-4 w-4" aria-hidden="true" />
              Open the transfer window
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] text-white sm:text-7xl">Launch a Formation board</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              Create a dedicated event link, send it to participants, and watch player cards, clubs, teams, and join requests update live.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Create", body: "Name the event and reserve the link.", icon: Radio },
                { label: "Share", body: "Use the QR or URL from the dashboard.", icon: QrCode },
                { label: "Form", body: "Participants register and build teams.", icon: UsersRound },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                    <Icon className="h-5 w-5 text-pitch-500" aria-hidden="true" />
                    <h2 className="mt-3 text-base font-black text-white">{item.label}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{item.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-lg border border-white/10 bg-zinc-950/70 p-5">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-trophy-400" aria-hidden="true" />
                <h2 className="text-xl font-black text-white">What organizers get</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <p className="rounded-md bg-white/[0.04] p-3">Event-specific onboarding, board, teams, QR page, and admin dashboard.</p>
                <p className="rounded-md bg-white/[0.04] p-3">The same live team formation flow already used by the World Cup Hack demo.</p>
              </div>
            </div>
          </div>

          <OrganizeEventForm />
        </section>
      </div>
    </main>
  );
}
