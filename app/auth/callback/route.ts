import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to arxiv-search after successful OAuth login
      redirect('/arxiv-search');
    } else {
      // Redirect to error page with error message
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // If no code, redirect to error page
  redirect('/auth/error?error=No authorization code provided');
}