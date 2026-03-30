import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "~/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      const admin = createSupabaseAdmin();
      const githubUsername =
        user.user_metadata?.user_name ??
        user.user_metadata?.preferred_username ??
        user.email?.split("@")[0] ??
        user.id.slice(0, 8);

      await admin.from("users").upsert(
        {
          supabase_auth_id: user.id,
          username: githubUsername,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "supabase_auth_id" },
      );

      return NextResponse.redirect(`${origin}/settings`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
