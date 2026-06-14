import { ArrowRight, BrainCircuit, ChartNoAxesCombined, QrCode, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { PlayerCard } from "@/components/player-card";
import { TeamCard } from "@/components/team-card";
import { demoEventBoard } from "@/lib/demo-data";

const sampleTeam = demoEventBoard.teams[0];
const sampleIdea = demoEventBoard.ideas.find((idea) => idea.id === sampleTeam.idea_id);

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="stadium-grid relative px-6 py-6 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="focus-ring rounded-md text-xl font-black tracking-wide text-white">
            ScoutBoard
          </Link>
          <Link
            href="/e/world-cup-hack"
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-4 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100"
          >
            Open demo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>

        <div className="mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-center py-16">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-md border border-trophy-400/30 bg-trophy-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-trophy-100">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Live hackathon transfer market
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] text-white sm:text-7xl lg:text-8xl">ScoutBoard</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
              Participants scan a QR code, create a player card, pitch ideas as clubs, and use the scout to form balanced teams while the transfer window is still hot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/e/world-cup-hack"
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-5 py-3 text-sm font-black text-pitch-950 hover:bg-pitch-100"
              >
                Enter World Cup Hack
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/e/world-cup-hack/board"
                className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.1]"
              >
                View live board
                <UsersRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-4 shadow-glow">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Transfer desk</p>
                <span className="rounded-md bg-pitch-500/10 px-2 py-1 text-xs font-bold text-pitch-100">Live</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Players", demoEventBoard.profiles.length],
                  ["Clubs", demoEventBoard.teams.length],
                  ["Open slots", 8],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <TeamCard team={sampleTeam} idea={sampleIdea} memberCount={2} eventSlug="world-cup-hack" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <PlayerCard profile={demoEventBoard.profiles[2]} compact />
              <PlayerCard profile={demoEventBoard.profiles[1]} compact />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "QR onboarding",
              body: "Anonymous Supabase sessions keep the first scan low-friction.",
              icon: QrCode,
            },
            {
              title: "Player cards",
              body: "Profiles capture positions, skills, vibe, and what each player wants to build.",
              icon: ShieldCheck,
            },
            {
              title: "Scout matching",
              body: "Deterministic scoring works even before OpenAI is configured.",
              icon: BrainCircuit,
            },
            {
              title: "Organizer view",
              body: "Premium dashboard hooks are ready for Stripe Checkout test mode.",
              icon: ChartNoAxesCombined,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-pitch-500/25 bg-pitch-500/10 text-pitch-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-black text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
