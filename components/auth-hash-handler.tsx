"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthHash = async () => {
      // Check if we have hash parameters (magic link tokens)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const tokenType = hashParams.get('token_type');
        const type = hashParams.get('type');

        // If we have the required tokens and it's a magic link
        if (accessToken && refreshToken && type === 'magiclink') {
          try {
            const supabase = createClient();

            // Set the session using the tokens from the hash
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname);

              // Redirect to the protected page
              router.push('/dashboard');
              return;
            } else {
              console.error('Session creation failed:', error);
            }
          } catch (error) {
            console.error('Error processing auth hash:', error);
          }
        }
      }
    };

    handleAuthHash();
  }, [router]);

  return null; // This component doesn't render anything
}