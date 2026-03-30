import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createSupabaseAdmin } from "~/lib/supabase-server";
import { createHash } from "node:crypto";

export interface ContextUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Context {
  user: ContextUser | null;
  supabase: ReturnType<typeof createSupabaseAdmin>;
}

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions,
): Promise<Context> {
  const supabase = createSupabaseAdmin();
  let user: ContextUser | null = null;

  // Strategy 1: PAT auth (CLI) — Bearer token
  const authHeader = opts.req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const hash = createHash("sha256").update(token).digest("hex");
    const { data: tokenRow } = await supabase
      .from("cli_tokens")
      .select("user_id")
      .eq("token_hash", hash)
      .single();

    if (tokenRow) {
      // Update last_used_at (fire and forget)
      supabase
        .from("cli_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", hash)
        .then(() => {});

      const { data: dbUser } = await supabase
        .from("users")
        .select("id, username, avatar_url")
        .eq("id", tokenRow.user_id)
        .single();

      if (dbUser) {
        user = dbUser;
      }
    }
  }

  // Strategy 2: Session auth (web) — Supabase session cookie
  if (!user) {
    const cookieHeader = opts.req.headers.get("cookie");
    if (cookieHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(
        // Extract access token from cookie if present
        cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)?.[1] ?? "",
      );
      if (authUser) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, username, avatar_url")
          .eq("supabase_auth_id", authUser.id)
          .single();
        if (dbUser) {
          user = dbUser;
        }
      }
    }
  }

  return { user, supabase };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
