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
        {/* Hero */}
        <section className="pt-20 pb-16 md:pt-32 md:pb-24 text-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none font-mono uppercase">
            GEAR
          </h1>
          <p className="text-neutral-500 text-lg md:text-xl leading-relaxed mt-4 max-w-xl mx-auto">
            Share your AI agent setup. Discover others.
            <br />
            Install with a single command.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 bg-neutral-900/60 border border-neutral-800 rounded-lg px-5 py-3">
            <code className="text-sm text-neutral-300 font-mono">
              <span className="text-neutral-600">$ </span>
              npx gearsh switch @user/setup
            </code>
            <CopyButton text="npx gearsh switch @user/setup" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
            <ClaudeIcon className="text-neutral-600 hover:text-neutral-300 transition" size={24} />
            <GeminiIcon className="text-neutral-600 hover:text-neutral-300 transition" size={24} />
            <CursorIcon className="text-neutral-600 hover:text-neutral-300 transition" size={24} />
            <WindsurfIcon className="text-neutral-600 hover:text-neutral-300 transition" size={24} />
            <CopilotIcon className="text-neutral-600 hover:text-neutral-300 transition" size={24} />
          </div>
        </section>

        {/* Quick Start */}
        <section className="pb-16 md:pb-20">
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <div className="bg-neutral-900/40 px-5 py-3 border-b border-neutral-800">
              <h2 className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
                Quick Start
              </h2>
            </div>
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
              <Step
                n={1}
                title="Install"
                cmd="npm install -g gearsh"
              />
              <Step
                n={2}
                title="Browse & install"
                cmd="gear switch @user/setup"
                description="Pick a gear from the leaderboard below, or search for one."
              />
              <Step
                n={3}
                title="Share yours"
                cmd="gear push"
                description="Scan your local agent config and publish it for others."
              />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-neutral-800/50" />

        {/* Leaderboard */}
        <section className="pt-10 pb-20">
          <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-6">
            Explore Gears
          </h2>

          <SearchBar />

          <LeaderboardTable profiles={profiles} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50">
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
      </footer>
    </>
  );
}

function Step({
  n,
  title,
  cmd,
  description,
}: {
  n: number;
  title: string;
  cmd: string;
  description?: string;
}) {
  return (
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-neutral-600 bg-neutral-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {n}
        </span>
        <span className="text-sm font-medium text-neutral-300">{title}</span>
      </div>
      {description && (
        <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
      )}
      <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 mt-auto">
        <code className="text-xs text-neutral-400 font-mono flex-1">
          <span className="text-neutral-600">$ </span>
          {cmd}
        </code>
        <CopyButton text={cmd} />
      </div>
    </div>
  );
}
