import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-zinc-200",
        className,
      )}
    >
      <Dumbbell className="h-3.5 w-3.5 text-trophy-400" aria-hidden="true" />
      {children}
    </span>
  );
}
