"use client";

import { Check, Link2, Share2, Type } from "lucide-react";
import { useState } from "react";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

type Copied = "link" | "text" | null;

export function ShareButtons({
  eventSlug,
  url,
  shareText,
  kind = "team",
  className,
}: {
  eventSlug: string;
  url: string;
  shareText: string;
  kind?: "team" | "profile";
  className?: string;
}) {
  const [copied, setCopied] = useState<Copied>(null);

  async function copy(value: string, which: Exclude<Copied, null>) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(which);
    track(ANALYTICS_EVENTS.SHARE_CARD_CLICKED, { event_slug: eventSlug, kind, action: `copy_${which}` });
    setTimeout(() => setCopied(null), 1800);
  }

  async function nativeShare() {
    track(ANALYTICS_EVENTS.SHARE_CARD_CLICKED, { event_slug: eventSlug, kind, action: "native" });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Formation", text: shareText, url });
      } catch {
        // user dismissed the share sheet — ignore
      }
      return;
    }
    await copy(`${shareText} ${url}`, "text");
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={nativeShare}
        className="focus-ring inline-flex items-center gap-2 rounded-md bg-pitch-500 px-3 py-2 text-sm font-black text-pitch-950 hover:bg-pitch-100"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {kind === "team" ? "Share team card" : "Share player card"}
      </button>
      <button
        type="button"
        onClick={() => copy(url, "link")}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/[0.1]"
      >
        {copied === "link" ? <Check className="h-4 w-4 text-pitch-500" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        {copied === "link" ? "Copied!" : kind === "team" ? "Copy link" : "Copy profile link"}
      </button>
      <button
        type="button"
        onClick={() => copy(`${shareText} ${url}`, "text")}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white hover:bg-white/[0.1]"
      >
        {copied === "text" ? <Check className="h-4 w-4 text-pitch-500" aria-hidden="true" /> : <Type className="h-4 w-4" aria-hidden="true" />}
        {copied === "text" ? "Copied!" : "Copy share text"}
      </button>
    </div>
  );
}
