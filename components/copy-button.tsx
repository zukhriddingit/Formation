"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy link",
  copiedLabel = "Copied!",
  className,
  onCopied,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked (insecure context). Fail quietly.
      return;
    }
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white transition hover:bg-white/[0.1]",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4 text-pitch-500" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
