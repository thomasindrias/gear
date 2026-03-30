import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gear-beige.vercel.app";
  const supabase = createSupabaseAdmin();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("slug, updated_at, users!inner(username)")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(5000);

  const profileEntries: MetadataRoute.Sitemap = (profiles ?? []).map((p) => {
    const username = Array.isArray(p.users)
      ? p.users[0]?.username
      : (p.users as { username: string })?.username;
    return {
      url: `${siteUrl}/${username}/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...profileEntries,
  ];
}
