import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { router, authedProcedure } from "../trpc";

export const tokenRouter = router({
  create: authedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const plaintext = `gear_pat_${randomBytes(32).toString("hex")}`;
      const hash = createHash("sha256").update(plaintext).digest("hex");

      const { error } = await ctx.supabase.from("cli_tokens").insert({
        user_id: ctx.user.id,
        token_hash: hash,
        name: input.name,
      });

      if (error) throw error;

      return { token: plaintext, name: input.name };
    }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("cli_tokens")
      .select("id, name, last_used_at, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }),

  revoke: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("cli_tokens")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw error;
      return { success: true };
    }),
});
