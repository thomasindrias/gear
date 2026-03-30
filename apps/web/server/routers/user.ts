import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "../trpc";

export const userRouter = router({
  me: authedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: user, error: userError } = await ctx.supabase
        .from("users")
        .select("id, username, avatar_url, created_at")
        .eq("username", input.username)
        .single();

      if (userError || !user) {
        throw new Error("User not found");
      }

      // Only show public profiles unless the viewer is the owner
      let q = ctx.supabase
        .from("profiles")
        .select("id, slug, name, description, tags, compatibility, downloads_count, created_at")
        .eq("user_id", user.id)
        .order("downloads_count", { ascending: false });

      if (!ctx.user || ctx.user.id !== user.id) {
        q = q.eq("is_public", true);
      }

      const { data: profiles } = await q;

      return { ...user, profiles: profiles ?? [] };
    }),
});
