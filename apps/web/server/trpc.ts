import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createSupabaseAdmin } from "~/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
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
  // SECURITY NOTE: This uses the service role key which bypasses RLS.
  // All authorization must be enforced in application code (router procedures).
  // Every mutation must verify ctx.user ownership before modifying data.
  const supabase = createSupabaseAdmin();
  let user: ContextUser | null = null;

  // Strategy 1: PAT auth (CLI) — Bearer token
  const authHeader = opts.req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const hash = createHash("sha256").update(token).digest("hex");
    const { data: tokenRow } = await supabase
      .from("cli_tokens")
      .select("user_id, expires_at")
      .eq("token_hash", hash)
      .single();

    if (tokenRow && (!tokenRow.expires_at || new Date(tokenRow.expires_at) > new Date())) {
      // Update last_used_at (fire and forget)
      void supabase
        .from("cli_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", hash);

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
      // Parse cookies from the request header
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...rest] = c.split("=");
          return [key, rest.join("=")];
        }),
      );

      const ssrClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return Object.entries(cookies).map(([name, value]) => ({
                name,
                value,
              }));
            },
            setAll() {},
          },
        },
      );

      const { data: { user: authUser } } = await ssrClient.auth.getUser();
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
