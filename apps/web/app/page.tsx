import { createSupabaseAdmin } from "~/lib/supabase-server";
import { Nav } from "./components/nav";
import { ProfileCard } from "./components/profile-card";
import { SearchBar } from "./components/search-bar";

interface PageProps {
  searchParams: Promise<{ q?: string; tags?: string; sort?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("profiles")
    .select("*, users!inner(username, avatar_url)")
    .order("downloads_count", { ascending: false })
    .limit(20);

  if (params.q) {
    query = query.textSearch("search_vector", params.q, { type: "websearch" });
  }

  if (params.tags) {
    const tags = params.tags.split(",").filter(Boolean);
    const compatTags = tags.filter((t) =>
      ["claude-code", "gemini-cli"].includes(t),
    );
    const otherTags = tags.filter(
      (t) => !["claude-code", "gemini-cli"].includes(t),
    );
    if (compatTags.length) query = query.contains("compatibility", compatTags);
    if (otherTags.length) query = query.contains("tags", otherTags);
  }

  const { data: profiles } = await query;

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6">
        <section className="py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Your agent&apos;s next{" "}
            <span className="text-amber-400">gear</span>
          </h1>
          <p className="text-neutral-400 text-lg mb-8 max-w-xl mx-auto">
            Share, discover, and hot-swap AI agent configurations.
            Like <span className="font-mono text-neutral-300">nvm</span>, but
            for agentic environments.
          </p>
          <div className="inline-flex items-center bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 font-mono text-sm mb-12">
            <span className="text-neutral-500 mr-2">$</span>
            <span className="text-amber-400">npm i -g gear-cli</span>
          </div>

          <SearchBar />
        </section>

        <section className="pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles?.map((profile: any) => (
              <ProfileCard
                key={profile.id}
                username={profile.users.username}
                slug={profile.slug}
                name={profile.name}
                description={profile.description}
                tags={profile.tags}
                compatibility={profile.compatibility}
                downloads_count={profile.downloads_count}
                avatar_url={profile.users.avatar_url}
              />
            ))}
          </div>

          {(!profiles || profiles.length === 0) && (
            <div className="text-center py-20 text-neutral-500">
              <p className="text-lg">No gears found.</p>
              <p className="text-sm mt-2">
                Be the first to publish one with{" "}
                <code className="text-amber-400">gear push</code>
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
