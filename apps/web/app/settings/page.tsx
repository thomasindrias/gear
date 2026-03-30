import { redirect } from "next/navigation";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { TokenManager } from "./token-manager";

export default async function SettingsPage() {
  const supabase = await createSupabaseSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>
        <TokenManager />
      </main>
    </>
  );
}
