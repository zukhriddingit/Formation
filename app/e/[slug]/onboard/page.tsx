import { ArrowLeft, IdCard } from "lucide-react";
import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding-form";
import { getEventBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getEventBoard(slug);

  return (
    <main className="min-h-screen px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link href={`/e/${slug}`} className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-bold text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event desk
        </Link>
        <header className="py-10">
          <p className="inline-flex items-center gap-2 rounded-md border border-pitch-500/25 bg-pitch-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pitch-100">
            <IdCard className="h-4 w-4" aria-hidden="true" />
            Player card
          </p>
          <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">Join {board.event.name}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
            Post your positions, vibe, and build interests so the scout can match you with the right club.
          </p>
        </header>
        <OnboardingForm eventSlug={slug} />
      </div>
    </main>
  );
}
