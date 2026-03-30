import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "../trpc";
import { gearfileSchema } from "@gear/shared";

const publishInput = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  compatibility: z.array(z.string()),
  gearfile_content: z.string(),
});

export const profileRouter = router({
  publish: authedProcedure.input(publishInput).mutation(async ({ ctx, input }) => {
    const match = input.gearfile_content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error("Invalid Gearfile format");
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
        .select("*, users!inner(username, avatar_url)")
        .eq("slug", input.slug)
        .eq("users.username", input.username)
        .single();

      if (error || !data) {
        throw new Error("Profile not found");
      }
      return data;
    }),

  download: publicProcedure
    .input(z.object({ username: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("id, gearfile_content, users!inner(username)")
        .eq("slug", input.slug)
        .eq("users.username", input.username)
        .single();

      if (error || !data) {
        throw new Error("Profile not found");
      }

      ctx.supabase.rpc("increment_downloads", { profile_id: data.id }).then(() => {});

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
});
