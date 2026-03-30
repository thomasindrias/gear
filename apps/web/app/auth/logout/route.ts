import { NextResponse } from "next/server";
import { createSupabaseSSR } from "~/lib/supabase-ssr";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const supabase = await createSupabaseSSR();
  await supabase.auth.signOut();
  return NextResponse.redirect(origin);
}
