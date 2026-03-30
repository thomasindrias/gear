import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "~/lib/supabase-server";
import { createSupabaseSSR } from "~/lib/supabase-ssr";
import { Nav } from "~/app/components/nav";
import { CopyButton } from "~/app/components/copy-button";
import { PluginList } from "~/app/components/plugin-list";
import { SkillPills } from "~/app/components/skill-pills";
import { AuditBadges } from "~/app/components/audit-badges";
import { VisibilityToggle } from "~/app/components/visibility-toggle";
import { RawGearfile } from "~/app/components/raw-gearfile";
import { CompatibilityBadge } from "~/app/components/compatibility-badge";
import { DetailAnimations } from "~/app/components/detail-animations";
import { parseGearfile } from "gear-shared";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, description, is_public, users!inner(username)")
    .eq("slug", slug)
    .eq("users.username", username)
    .single();

  if (!profile || !profile.is_public) {
    return { title: "Not Found" };
  }

  const title = `${profile.name} by @${username}`;
  const description = profile.description || `AI agent configuration by @${username}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/${username}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, users!inner(id, username, avatar_url)")
    .eq("slug", slug)
    .eq("users.username", username)
    .single();

  if (!profile) notFound();

  const ssrClient = await createSupabaseSSR();
  const { data: { user: authUser } } = await ssrClient.auth.getUser();

  let currentUserId: string | null = null;
  if (authUser) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("supabase_auth_id", authUser.id)
      .single();
    currentUserId = dbUser?.id ?? null;
  }

  if (!profile.is_public && currentUserId !== profile.users.id) {
    notFound();
  }

  const isOwner = currentUserId === profile.users.id;
  const installCmd = `npx gearsh switch @${profile.users.username}/${profile.slug}`;

  let plugins: { name: string; marketplace: string }[] = [];
  let skills: { name: string; source: string }[] = [];
  let mcpServers: { name: string; runtime: string; package: string }[] = [];
  let instructions: string | null = null;
  let version = "1.0.0";
  let model: string | null = null;

  try {
    const parsed = parseGearfile(profile.gearfile_content);
    plugins = parsed.frontmatter.plugins ?? [];
    skills = parsed.frontmatter.skills ?? [];
    mcpServers = (parsed.frontmatter.mcp_servers ?? []) as typeof mcpServers;
    instructions = parsed.frontmatter.instructions ?? null;
    version = parsed.frontmatter.version;
    if (parsed.frontmatter.overrides) {
      const claudeOverrides = parsed.frontmatter.overrides["claude-code"];
      if (claudeOverrides && typeof claudeOverrides === "object" && "model" in claudeOverrides) {
        model = claudeOverrides.model as string;
      }
    }
  } catch {
    // If parsing fails, show raw content only
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: profile.name,
    description: profile.description,
    author: {
      "@type": "Person",
      name: profile.users.username,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://gear.sh"}/${profile.users.username}`,
    },
    applicationCategory: "AI Agent Configuration",
    operatingSystem: profile.compatibility?.join(", ") ?? "Any",
    softwareVersion: version,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/DownloadAction",
      userInteractionCount: profile.downloads_count,
    },
    datePublished: profile.created_at,
    dateModified: profile.updated_at,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <DetailAnimations>
          <div className="flex flex-col md:flex-row gap-10 md:gap-14">
            {/* Left Column */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Header */}
              <div className="flex items-center gap-4">
                {profile.users.avatar_url && (
                  <img
                    src={profile.users.avatar_url}
                    alt={profile.users.username}
                    className="w-12 h-12 rounded-full ring-2 ring-neutral-800"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile.name}
                  </h1>
                  <a
                    href={`/${profile.users.username}`}
                    className="text-sm text-neutral-600 font-mono hover:text-neutral-400 transition-colors"
                  >
                    @{profile.users.username}/{profile.slug}
                  </a>
                </div>
              </div>

              {/* Install command */}
              <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800/60 rounded-xl px-5 py-3.5 shadow-lg shadow-black/20">
                <code className="text-sm text-neutral-300 font-mono flex-1">
                  <span className="text-neutral-600">$ </span>
                  {installCmd}
                </code>
                <CopyButton text={installCmd} />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 p-5">
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                  About
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {profile.description}
                </p>
              </div>

              {/* Plugins */}
              <PluginList plugins={plugins} metadata={profile.plugin_metadata} />

              {/* Skills */}
              <SkillPills skills={skills} skillMeta={profile.skill_metadata} />

              {/* MCP Servers */}
              {mcpServers.length > 0 && (
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 pb-2 border-b border-neutral-800/40">
                    MCP Servers ({mcpServers.length})
                  </div>
                  <div className="flex flex-col">
                    {mcpServers.map((server) => (
                      <div
                        key={server.name}
                        className="flex items-center justify-between py-3 px-1 border-b border-neutral-800/20 last:border-0"
                      >
                        <span className="text-sm font-semibold text-neutral-200">
                          {server.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-600 font-mono">
                            {server.package}
                          </span>
                          <span className="text-[10px] text-neutral-700 font-mono bg-neutral-900 border border-neutral-800/40 px-1.5 py-0.5 rounded">
                            {server.runtime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {instructions && (
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 pb-2 border-b border-neutral-800/40">
                    Instructions
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800/50 rounded-xl p-4">
                    {instructions.trim().split("\n").every((line) => line.trim().startsWith("@")) ? (
                      <div className="flex flex-col gap-2">
                        {instructions.trim().split("\n").map((line) => {
                          const file = line.trim().replace(/^@/, "");
                          return (
                            <div key={file} className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                              <svg className="w-3.5 h-3.5 text-neutral-600 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 1.5h6.5L13 5v9.5H3z" />
                                <path d="M9.5 1.5V5H13" />
                              </svg>
                              <span>References external config</span>
                              <code className="text-neutral-400">{file}</code>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap leading-relaxed">
                        {instructions}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Gearfile */}
              <RawGearfile content={profile.gearfile_content} />
            </div>

            {/* Right Sidebar */}
            <div className="w-full md:w-56 shrink-0">
              <div className="md:sticky md:top-20 space-y-6">
                {/* Total Installs */}
                <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 p-4 text-center">
                  <div className="text-3xl font-bold font-mono text-neutral-100">
                    {profile.downloads_count.toLocaleString()}
                  </div>
                  <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mt-1">
                    Installs
                  </div>
                </div>

                {/* Compatibility */}
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                    Compatibility
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.compatibility.map((p: string) => (
                      <CompatibilityBadge key={p} platform={p} />
                    ))}
                  </div>
                </div>

                {/* Security Audits */}
                <AuditBadges results={profile.audit_results} />

                {/* Visibility */}
                <VisibilityToggle
                  profileId={profile.id}
                  initialValue={profile.is_public}
                  isOwner={isOwner}
                />

                {/* Meta info */}
                <div className="space-y-3 pt-2 border-t border-neutral-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-600 font-mono uppercase">Version</span>
                    <span className="text-xs text-neutral-400 font-mono">{version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-600 font-mono uppercase">Published</span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {model && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-600 font-mono uppercase">Model</span>
                      <span className="text-xs text-neutral-400 font-mono">{model}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {profile.tags.length > 0 && (
                  <div>
                    <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.tags.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900/50 border border-neutral-800/50 rounded-md text-neutral-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DetailAnimations>
      </main>
    </>
  );
}
