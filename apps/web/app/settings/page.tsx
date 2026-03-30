import { redirect } from "next/navigation";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { TokenManager } from "./token-manager";
import { GearList } from "~/app/components/gear-list";
import { SettingsAnimations } from "./settings-animations";

export default async function SettingsPage() {
  const supabase = await createSupabaseSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <SettingsAnimations>
          <h1 className="text-2xl font-bold tracking-tight mb-10">Settings</h1>

          {/* My Gears */}
          <section className="mb-10">
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-800/40">
                <h2 className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
                  My Gears
                </h2>
              </div>
              <div className="p-5">
                <GearList />
              </div>
            </div>
          </section>

          {/* CLI Tokens */}
          <section>
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-800/40">
                <h2 className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
                  CLI Tokens
                </h2>
              </div>
              <div className="p-5">
                <TokenManager />
              </div>
            </div>
          </section>
        </SettingsAnimations>
      </main>
    </>
  );
}
