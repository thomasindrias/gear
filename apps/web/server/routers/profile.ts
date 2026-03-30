import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, authedProcedure } from "../trpc";
import { parseGearfile } from "gear-shared";
import { runAudits } from "../lib/auditor";
import { enrichPlugins, enrichSkills } from "../lib/plugin-enricher";

const publishInput = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  compatibility: z.array(z.string()),
  gearfile_content: z.string(),
  is_public: z.boolean().default(true),
});

export const profileRouter = router({
  publish: authedProcedure.input(publishInput).mutation(async ({ ctx, input }) => {
    const match = input.gearfile_content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Invalid Gearfile format");
    }

    // Extract plugins and skills from gearfile for auditing/enrichment
    let plugins: { name: string; marketplace: string }[] = [];
    let skills: { name: string; source: string }[] = [];
    try {
      const parsed = parseGearfile(input.gearfile_content);
      plugins = parsed.frontmatter.plugins ?? [];
      skills = parsed.frontmatter.skills ?? [];
    } catch {
      // If parsing fails, proceed without plugin/skill data
    }

    // Run audits
    const audit_results = runAudits(input.gearfile_content, plugins);

    // Enrich plugin metadata (GitHub stars) and skill metadata (skills.sh URLs)
    let plugin_metadata = null;
    let skill_metadata = null;
    try {
      const marketplaces = [...new Set(plugins.map((p) => p.marketplace))];
      [plugin_metadata, skill_metadata] = await Promise.all([
        enrichPlugins(plugins),
        enrichSkills(skills, marketplaces),
      ]);
    } catch {
      // Enrichment failure is non-fatal
    }

    const { data, error } = await ctx.supabase
      .from("profiles")
      .upsert(
        {
          user_id: ctx.user.id,
          slug: input.slug,
          name: input.name,
          description: input.description,
          tags: input.tags,
          compatibility: input.compatibility,
          gearfile_content: input.gearfile_content,
          is_public: input.is_public,
          audit_results,
          plugin_metadata,
          skill_metadata,
        },
        { onConflict: "user_id,slug" },
      )
      .select("id, slug")
      .single();

    if (error) throw error;
    return { id: data.id, slug: data.slug, username: ctx.user.username };
  }),

  get: publicProcedure
    .input(z.object({ username: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("*, users!inner(id, username, avatar_url)")
        .eq("slug", input.slug)
        .eq("users.username", input.username)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      // Private profiles only visible to owner
      if (!data.is_public) {
        if (!ctx.user || ctx.user.id !== data.users.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        }
      }

      return data;
    }),

  download: publicProcedure
    .input(z.object({ username: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("id, gearfile_content, is_public, user_id, users!inner(username)")
        .eq("slug", input.slug)
        .eq("users.username", input.username)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      // Private profiles only downloadable by owner
      if (!data.is_public) {
        if (!ctx.user || ctx.user.id !== data.user_id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        }
      }

      void ctx.supabase.rpc("increment_downloads", { profile_id: data.id });

      return { gearfile_content: data.gearfile_content };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        tags: z.array(z.string()).optional(),
        compatibility: z.array(z.string()).optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("profiles")
        .select("*, users!inner(username, avatar_url)")
        .order("downloads_count", { ascending: false })
        .limit(input.limit + 1);

      q = q.eq("is_public", true);

      if (input.query) {
        q = q.textSearch("search_vector", input.query, { type: "websearch" });
      }
      if (input.tags?.length) {
        q = q.contains("tags", input.tags);
      }
      if (input.compatibility?.length) {
        q = q.contains("compatibility", input.compatibility);
      }
      if (input.cursor) {
        q = q.lt("id", input.cursor);
      }

      const { data, error } = await q;
      if (error) throw error;

      const items = data ?? [];
      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;
      const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

      return { items: results, nextCursor };
    }),

  list: publicProcedure
    .input(
      z.object({
        sort: z.enum(["downloads", "recent"]).default("downloads"),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderCol = input.sort === "downloads" ? "downloads_count" : "created_at";
      let q = ctx.supabase
        .from("profiles")
        .select("*, users!inner(username, avatar_url)")
        .order(orderCol, { ascending: false })
        .limit(input.limit + 1);

      q = q.eq("is_public", true);

      if (input.cursor) {
        q = q.lt("id", input.cursor);
      }

      const { data, error } = await q;
      if (error) throw error;

      const items = data ?? [];
      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;
      const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

      return { items: results, nextCursor };
    }),

  delete: authedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("profiles")
        .delete()
        .eq("user_id", ctx.user.id)
        .eq("slug", input.slug);

      if (error) throw error;
      return { success: true };
    }),

  toggleVisibility: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("id, is_public, user_id")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      const newValue = !profile.is_public;
      const { error } = await ctx.supabase
        .from("profiles")
        .update({ is_public: newValue })
        .eq("id", input.id);

      if (error) throw error;
      return { is_public: newValue };
    }),

  listOwn: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("id, slug, name, is_public, downloads_count, created_at, users!inner(username)")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }),
});
