import {
  ArrowLeft,
  ChartNoAxesCombined,
  CreditCard,
  ExternalLink,
  Mail,
  QrCode as QrCodeIcon,
  ScanLine,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { AdminCheckoutButton } from "@/components/admin-checkout-button";
import { CopyButton } from "@/components/copy-button";
import { EventNotFound } from "@/components/event-not-found";
import { PremiumFeatures } from "@/components/premium-features";
import { QrCode } from "@/components/qr-code";
import { StatCard } from "@/components/stat-card";
import { getBoardStats, getEventBoard, getFormationFunnel, isEventPremium } from "@/lib/data";
import { appUrl, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);

  if (!board) {
    return <EventNotFound slug={slug} />;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  const requestOrigin = host ? `${protocol}://${host}` : undefined;

  const stats = getBoardStats(board);
  const funnel = getFormationFunnel(board);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const isPremium = isEventPremium(board.event);
  const eventUrl = appUrl(`/e/${slug}`, requestOrigin);
  const projectedAmount = 4900;

  const teamRows = board.teams.map((team) => ({
    team,
    memberCount: board.team_members.filter((member) => member.team_id === team.id).length,
  }));

  const funnelStages = [
    { label: "Visited", value: funnel.visited },
    { label: "Profiles created", value: funnel.profiles },
    { label: "Join requests", value: funnel.joinRequests },
    { label: "Teams formed", value: funnel.teamsFormed },
  ];
  const funnelMax = Math.max(...funnelStages.map((stage) => stage.value), 1);

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Formation Pro - Event Dashboard</p>
            <p className="mt-3 text-3xl font-black text-white">{formatCurrency(projectedAmount)}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              One-time unlock: CSV exports, sponsor branding, and the advanced matching report.
            </p>
            <div className="mt-5">
              <AdminCheckoutButton eventSlug={slug} configured={stripeConfigured} isPremium={isPremium} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Players" value={stats.players} detail={`${stats.looking} still available`} icon={UsersRound} />
          <StatCard label="Teams" value={stats.clubs} detail={`${stats.openTeams} forming clubs`} icon={ShieldCheck} />
          <StatCard label="Open positions" value={stats.openPositions} detail="Recruiting gaps to close" icon={ChartNoAxesCombined} />
          <StatCard label="Teams formed" value={funnel.teamsFormed} detail="Clubs past a solo founder" icon={Mail} />
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-5 w-5 text-pitch-500" aria-hidden="true" />
            <h2 className="text-xl font-black text-white">Formation funnel</h2>
          </div>
          <div className="mt-5 space-y-4">
            {funnelStages.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-zinc-300">{stage.label}</span>
                  <span className="font-black text-white">{stage.value}</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-white/[0.08]">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-pitch-600 to-pitch-500"
                    style={{ width: `${Math.round((stage.value / funnelMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Counts are derived from the live board. The true top-of-funnel number is tracked in PostHog via{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5">event_page_viewed</code>.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-trophy-400" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Event QR &amp; link</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
              <QrCode value={eventUrl} size={140} className="overflow-hidden rounded-lg border border-white/10 bg-white p-2" />
              <div className="min-w-0">
                <p className="break-all rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">{eventUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton value={eventUrl} className="px-2.5 py-1.5 text-xs" />
                  <Link
                    href={`/e/${slug}/board`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/[0.1]"
                  >
                    Open board
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/e/${slug}/qr`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/[0.1]"
                  >
                    <QrCodeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Public QR view
                  </Link>
                </div>
              </div>
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
                ["Resend", process.env.RESEND_API_KEY ? "Configured" : "Demo (console log)"],
                ["Stripe", stripeConfigured ? "Configured" : "Demo (button disabled)"],
                ["PostHog", process.env.NEXT_PUBLIC_POSTHOG_KEY ? "Configured" : "Disabled (no-op)"],
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

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <PremiumFeatures
            eventSlug={slug}
            eventName={board.event.name}
            isPremium={isPremium}
            players={board.profiles.map((profile) => ({
              name: profile.name,
              headline: profile.headline,
              positions: profile.positions,
              skills: profile.skills,
              vibe: profile.vibe,
              experience_level: profile.experience_level,
              looking_for_team: profile.looking_for_team,
            }))}
            teams={teamRows}
          />

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-5 w-5 text-pitch-500" aria-hidden="true" />
              <h2 className="text-xl font-black text-white">Roster balance</h2>
            </div>
            <div className="mt-5 space-y-3">
              {teamRows.length > 0 ? (
                teamRows.map(({ team, memberCount }) => {
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
                })
              ) : (
                <p className="text-sm text-zinc-400">No clubs on the board yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
