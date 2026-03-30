import { NextResponse } from "next/server";
import { createSupabaseSSR } from "~/lib/supabase-ssr";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createSupabaseSSR();
  await supabase.auth.signOut();
  return NextResponse.redirect(origin);
}
