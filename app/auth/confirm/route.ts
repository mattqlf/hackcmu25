import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { getUserProfile } from "@/lib/supabase/user-profiles";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // Check if this is a new user without a complete profile
      try {
        const profile = await getUserProfile();
        if (!profile || !profile.full_name) {
          // New user or incomplete profile - redirect to profile setup
          redirect('/profile?welcome=true');
        } else {
          // Existing user with complete profile
          redirect(next);
        }
      } catch (error) {
        // If there's an error checking profile, redirect to profile setup to be safe
        redirect('/profile?welcome=true');
      }
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
