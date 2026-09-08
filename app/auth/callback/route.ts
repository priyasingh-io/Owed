import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handles exchange of email confirmation or OAuth code for a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error parameter if verification fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
