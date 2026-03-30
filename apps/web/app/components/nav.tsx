import Link from "next/link";
import { createSupabaseSSR } from "~/lib/supabase-ssr";

export async function Nav() {
  const supabase = await createSupabaseSSR();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-amber-400">gear</span>
          <span className="text-neutral-500">.sh</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/settings"
                className="text-sm text-neutral-400 hover:text-neutral-100 transition"
              >
                Settings
              </Link>
              <a
                href="/auth/logout"
                className="text-sm text-neutral-400 hover:text-neutral-100 transition"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-sm bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-md transition"
            >
              Sign in with GitHub
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
