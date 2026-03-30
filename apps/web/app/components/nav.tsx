import Link from "next/link";
import { createSupabaseSSR } from "~/lib/supabase-ssr";

export async function Nav() {
  const supabase = await createSupabaseSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b border-neutral-800/50 sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-mono font-bold tracking-tight text-neutral-300 hover:text-white transition"
        >
          gear<span className="text-emerald-500/60">.</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="text-xs font-mono text-neutral-500 hover:text-neutral-200 transition"
          >
            Explore
          </Link>
          {user ? (
            <>
              <Link
                href="/settings"
                className="text-xs font-mono text-neutral-500 hover:text-neutral-200 transition"
              >
                Settings
              </Link>
              <a
                href="/auth/logout"
                className="text-xs font-mono text-neutral-500 hover:text-neutral-200 transition"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-xs font-mono text-neutral-500 hover:text-neutral-200 transition"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
