import { createSupabaseAdmin } from "~/lib/supabase-server";
import { Nav } from "./components/nav";
import { SearchBar } from "./components/search-bar";
import { CopyButton } from "./components/copy-button";
import { LeaderboardTable } from "./components/leaderboard-table";
import {
  ClaudeIcon,
  GeminiIcon,
  CursorIcon,
  WindsurfIcon,
  CopilotIcon,
} from "./components/icons";

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
        {/* Hero */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16 flex flex-col md:flex-row md:items-start gap-8 md:gap-16">
          <div className="shrink-0">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none font-mono uppercase">
              GEAR
            </h1>
            <p className="text-[11px] tracking-[0.3em] text-neutral-600 uppercase mt-2 font-mono">
              The open agent config ecosystem
            </p>
          </div>
          <p className="text-neutral-500 text-lg md:text-xl leading-relaxed md:pt-2 max-w-lg">
            Portable AI agent configurations. Share your setup, discover
            others, install with a single command.
          </p>
        </section>

        {/* Try it now + Compatible agents */}
        <section className="pb-12 md:pb-16 flex flex-col md:flex-row gap-10 md:gap-20">
          <div>
            <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-4">
              Try it now
            </h2>
            <div className="inline-flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-lg px-5 py-3">
              <code className="text-sm text-neutral-300 font-mono">
                <span className="text-neutral-600">$ </span>
                gear switch @user/setup
              </code>
              <CopyButton text="gear switch @user/setup" />
            </div>
          </div>

          <div>
            <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-4">
              Available for these agents
            </h2>
            <div className="flex items-center gap-5">
              <ClaudeIcon className="text-neutral-500 hover:text-neutral-200 transition" size={28} />
              <GeminiIcon className="text-neutral-500 hover:text-neutral-200 transition" size={28} />
              <CursorIcon className="text-neutral-500 hover:text-neutral-200 transition" size={28} />
              <WindsurfIcon className="text-neutral-500 hover:text-neutral-200 transition" size={28} />
              <CopilotIcon className="text-neutral-500 hover:text-neutral-200 transition" size={28} />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-neutral-800/50" />

        {/* Leaderboard */}
        <section className="pt-10 pb-20">
          <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-6">
            Gears Leaderboard
          </h2>

          <SearchBar />

          <LeaderboardTable profiles={profiles} />
        </section>
      </main>
    </>
  );
}
