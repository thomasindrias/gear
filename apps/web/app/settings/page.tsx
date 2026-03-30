import { redirect } from "next/navigation";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { TokenManager } from "./token-manager";
import { GearList } from "~/app/components/gear-list";

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
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-4">
            My Gears
          </div>
          <GearList />
        </div>

        <div>
          <TokenManager />
        </div>
      </main>
    </>
  );
}
