import { ArrowLeft, ChartNoAxesCombined, CreditCard, Mail, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminCheckoutButton } from "@/components/admin-checkout-button";
import { StatCard } from "@/components/stat-card";
import { getBoardStats, getEventBoard } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);
  const stats = getBoardStats(board);
  const projectedAmount = 4900;

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href={`/e/${slug}`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event desk
        </Link>

        <header className="grid gap-6 py-10 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pitch-100">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Organizer dashboard
            </p>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{board.event.name} command center</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
              Monitor the transfer window, spot unbalanced teams, and unlock premium organizer tools through Stripe test mode.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Premium access</p>
            <p className="mt-3 text-3xl font-black text-white">{formatCurrency(projectedAmount)}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Checkout unlocks organizer exports, featured club placement, and transfer analytics.</p>
            <div className="mt-5">
              <AdminCheckoutButton eventSlug={slug} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Players" value={stats.players} detail={`${stats.looking} still available`} icon={UsersRound} />
          <StatCard label="Teams" value={stats.clubs} detail={`${stats.openTeams} forming clubs`} icon={ShieldCheck} />
          <StatCard label="Open positions" value={stats.openPositions} detail="Recruiting gaps to close" icon={ChartNoAxesCombined} />
          <StatCard label="Emails" value="Stub" detail="Resend intro route ready" icon={Mail} />
        </section>

        <section className="grid gap-6 py-12 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Roster balance</h2>
            </div>
            <div className="mt-5 space-y-3">
              {board.teams.map((team) => {
                const memberCount = board.team_members.filter((member) => member.team_id === team.id).length;
                const fillRate = Math.round((memberCount / team.max_size) * 100);
                return (
                  <div key={team.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold text-white">{team.name}</p>
                      <span className="text-sm text-zinc-400">{fillRate}% full</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                      <div className="h-2 rounded-full bg-pitch-500" style={{ width: `${fillRate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-trophy-400" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Integration status</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Supabase", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "Demo fallback"],
                ["Resend", process.env.RESEND_API_KEY ? "Configured" : "Stub mode"],
                ["Stripe", process.env.STRIPE_SECRET_KEY ? "Configured" : "Test stub"],
                ["NVIDIA Nemotron", process.env.NVIDIA_API_KEY ? "Configured" : "Deterministic scout"],
              ].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-950/70 px-4 py-3">
                  <span className="font-semibold text-white">{name}</span>
                  <span className="text-sm text-zinc-400">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
