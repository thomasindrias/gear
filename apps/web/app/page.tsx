import { createSupabaseAdmin } from "~/lib/supabase-server";
import { Nav } from "./components/nav";
import { SearchBar } from "./components/search-bar";
import { LeaderboardTable } from "./components/leaderboard-table";
import {
  AnimatedHero,
  AnimatedQuickStart,
  AnimatedSection,
} from "./components/animated-landing";

interface PageProps {
  searchParams: Promise<{ q?: string; tags?: string; sort?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("profiles")
    .select("*, users!inner(username, avatar_url)")
    .eq("is_public", true)
    .order("downloads_count", { ascending: false })
    .limit(50);

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
      <main className="max-w-5xl mx-auto px-6">
        <AnimatedHero />

        <AnimatedQuickStart />

        {/* Divider */}
        <div className="border-t border-neutral-800/50" />

        {/* Leaderboard */}
        <AnimatedSection className="pt-10 pb-20">
          <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-6">
            Explore Gears
          </h2>

          <SearchBar />

          <LeaderboardTable profiles={profiles} />
        </AnimatedSection>
      </main>

      {/* Footer */}
      <AnimatedSection className="border-t border-neutral-800/50">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-mono text-neutral-600">
            gear — the open agent config ecosystem
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/thomasindrias/gear"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-neutral-600 hover:text-neutral-400 transition"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/gearsh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-neutral-600 hover:text-neutral-400 transition"
            >
              npm
            </a>
          </div>
        </div>
      </AnimatedSection>
    </>
  );
}
