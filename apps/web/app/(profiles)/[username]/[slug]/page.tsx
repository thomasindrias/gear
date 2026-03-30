import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "~/lib/supabase-server";
import { Nav } from "~/app/components/nav";
import { CompatibilityBadge } from "~/app/components/compatibility-badge";
import { CopyButton } from "~/app/components/copy-button";
import { GearfileRenderer } from "~/app/components/gearfile-renderer";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, users!inner(username, avatar_url)")
    .eq("slug", slug)
    .eq("users.username", username)
    .single();

  if (!profile) notFound();

  const installCmd = `gear switch @${profile.users.username}/${profile.slug}`;

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
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

          <p className="text-neutral-400 mb-5">{profile.description}</p>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {profile.compatibility.map((p: string) => (
              <CompatibilityBadge key={p} platform={p} />
            ))}
            {profile.tags.map((t: string) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-500 font-mono"
              >
                {t}
              </span>
            ))}
            <span className="text-xs text-neutral-600 font-mono ml-1">
              {profile.downloads_count.toLocaleString()} installs
            </span>
          </div>

          <div className="inline-flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-lg px-5 py-3">
            <code className="text-sm text-neutral-300 font-mono">
              <span className="text-neutral-600">$ </span>
              {installCmd}
            </code>
            <CopyButton text={installCmd} />
          </div>
        </div>

        <GearfileRenderer content={profile.gearfile_content} />
      </main>
    </>
  );
}
