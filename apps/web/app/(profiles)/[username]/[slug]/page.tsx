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

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {profile.users.avatar_url && (
              <img
                src={profile.users.avatar_url}
                alt={profile.users.username}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <span className="text-sm text-neutral-500 font-mono">
                @{profile.users.username}/{profile.slug}
              </span>
            </div>
          </div>

          <p className="text-neutral-400 mb-4">{profile.description}</p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            {profile.compatibility.map((p: string) => (
              <CompatibilityBadge key={p} platform={p} />
            ))}
            {profile.tags.map((t: string) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400"
              >
                {t}
              </span>
            ))}
            <span className="text-xs text-neutral-600">
              {profile.downloads_count.toLocaleString()} downloads
            </span>
          </div>

          <CopyButton
            text={`gear switch @${profile.users.username}/${profile.slug}`}
            label={`$ gear switch @${profile.users.username}/${profile.slug}`}
          />
        </div>

        <GearfileRenderer content={profile.gearfile_content} />
      </main>
    </>
  );
}
