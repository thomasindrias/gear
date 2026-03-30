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
import { parseGearfile } from "@gear/shared";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
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

  // Check visibility — private profiles only visible to owner
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
  const installCmd = `gear switch @${profile.users.username}/${profile.slug}`;

  // Parse gearfile for structured sections
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

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10 md:gap-12">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {profile.users.avatar_url && (
                  <img
                    src={profile.users.avatar_url}
                    alt={profile.users.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile.name}
                  </h1>
                  <span className="text-sm text-neutral-600 font-mono">
                    @{profile.users.username}/{profile.slug}
                  </span>
                </div>
              </div>
            </div>

            {/* Install command */}
            <div className="inline-flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-lg px-5 py-3">
              <code className="text-sm text-neutral-300 font-mono">
                <span className="text-neutral-600">$ </span>
                {installCmd}
              </code>
              <CopyButton text={installCmd} />
            </div>

            {/* Summary */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5">
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                Summary
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {profile.description}
              </p>
            </div>

            {/* Plugins */}
            <PluginList plugins={plugins} metadata={profile.plugin_metadata} />

            {/* Skills */}
            <SkillPills skills={skills} pluginMeta={profile.plugin_metadata} />

            {/* MCP Servers */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
                MCP Servers ({mcpServers.length})
              </div>
              {mcpServers.length === 0 ? (
                <p className="text-xs text-neutral-600 font-mono">
                  No MCP servers configured
                </p>
              ) : (
                <div className="flex flex-col">
                  {mcpServers.map((server) => (
                    <div
                      key={server.name}
                      className="flex items-center justify-between py-2.5 px-1 border-b border-neutral-800/30"
                    >
                      <span className="text-sm font-semibold text-neutral-200">
                        {server.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-600 font-mono">
                          {server.package}
                        </span>
                        <span className="text-[10px] text-neutral-700 font-mono bg-neutral-900 px-1.5 py-0.5 rounded">
                          {server.runtime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            {instructions && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
                  Instructions
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                  <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap">
                    {instructions}
                  </pre>
                </div>
              </div>
            )}

            {/* Raw Gearfile */}
            <RawGearfile content={profile.gearfile_content} />
          </div>

          {/* Right Sidebar */}
          <div className="w-full md:w-52 shrink-0 space-y-7">
            {/* Total Installs */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Total Installs
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-100">
                {profile.downloads_count.toLocaleString()}
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

            {/* Version */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Version
              </div>
              <div className="text-sm text-neutral-400 font-mono">{version}</div>
            </div>

            {/* Published */}
            <div>
              <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                Published
              </div>
              <div className="text-sm text-neutral-400 font-mono">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Tags */}
            {profile.tags.length > 0 && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Model */}
            {model && (
              <div>
                <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-1">
                  Model
                </div>
                <div className="text-sm text-neutral-400 font-mono">{model}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
