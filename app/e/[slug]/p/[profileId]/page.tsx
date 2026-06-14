import { ArrowLeft, Share2, Target, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerCard } from "@/components/player-card";
import { ScoutPanel } from "@/components/scout-panel";
import { ShareButtons } from "@/components/share-buttons";
import { getEventBoard, profileById, toClientBoard } from "@/lib/data";
import { recommendTeammatesForProfile } from "@/lib/scout/scoring";
import { profileShareText, profileShareUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; profileId: string }>;
}): Promise<Metadata> {
  const { slug, profileId } = await params;
  const board = await getEventBoard(slug);
  const profile = profileById(board, profileId);

  if (!profile) {
    return { title: "Player not found · Formation" };
  }

  const title = `${profile.name} · ${board.event.name} · Formation`;
  const description = profile.headline ?? `${profile.name} is on the Formation transfer board.`;
  const url = profileShareUrl(slug, profileId);

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Formation", type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string; profileId: string }>;
}) {
  const { slug, profileId } = await params;
  const board = toClientBoard(await getEventBoard(slug));
  const profile = profileById(board, profileId);

  if (!profile) {
    notFound();
  }

  const teammates = recommendTeammatesForProfile(board, profileId, 3);

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <Link href={`/e/${slug}/board`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Transfer board
        </Link>

        <header className="py-10">
          <p className="inline-flex items-center gap-2 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pitch-100">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Player card
          </p>
          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">{profile.name}</h1>
          {profile.wants_to_build ? (
            <p className="mt-4 inline-flex max-w-2xl items-center gap-2 text-lg leading-8 text-zinc-300">
              <Target className="h-5 w-5 shrink-0 text-pitch-500" aria-hidden="true" />
              {profile.wants_to_build}
            </p>
          ) : null}
        </header>

        <section className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <PlayerCard profile={profile} eventSlug={slug} />
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-trophy-400" aria-hidden="true" />
                <h2 className="text-xl font-black text-white">Share this card</h2>
              </div>
              <ShareButtons
                eventSlug={slug}
                url={profileShareUrl(slug, profileId)}
                shareText={profileShareText(profile)}
                kind="profile"
              />
            </div>
          </div>

          <ScoutPanel
            eventSlug={slug}
            mode="teammates_for_player"
            recommendations={teammates}
            title="Teammates the scout suggests"
            subtitle={`Players who complement ${profile.name}`}
          />
        </section>
      </div>
    </main>
  );
}
