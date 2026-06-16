"use client";

import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function isAnonymousUser(user: User | null) {
  return Boolean(user && ((user as User & { is_anonymous?: boolean }).is_anonymous || !user.email));
}

export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(pathname || "/")}`, [pathname]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      router.refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="hidden h-10 w-28 animate-pulse rounded-md border border-white/10 bg-white/[0.04] sm:block" aria-hidden="true" />
    );
  }

  if (!user || isAnonymousUser(user)) {
    return (
      <Link
        href={loginHref}
        className="focus-ring inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white transition hover:bg-white/[0.1]"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{user ? "Guest" : "Sign in"}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-zinc-300 sm:flex">
        <UserRound className="h-4 w-4 text-pitch-500" aria-hidden="true" />
        <span className="max-w-[180px] truncate">{user.email}</span>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
