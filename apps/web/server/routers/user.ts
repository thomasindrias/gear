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

      const { data: profiles } = await ctx.supabase
        .from("profiles")
        .select("id, slug, name, description, tags, compatibility, downloads_count, created_at")
        .eq("user_id", user.id)
        .order("downloads_count", { ascending: false });

      return { ...user, profiles: profiles ?? [] };
    }),
});
