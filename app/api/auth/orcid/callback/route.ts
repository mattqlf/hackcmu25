import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeCodeForToken,
  getORCIDUserInfo,
  createSupabaseUser,
  generateSupabaseJWT,
} from '@/lib/orcid-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('ORCID OAuth error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent('ORCID authentication failed')}`
    );
  }

  // Check for required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  try {
    // Validate CSRF state token
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, value: c.value })));

    const storedState = cookieStore.get('orcid-state')?.value;
    console.log('Stored state:', storedState);
    console.log('Received state:', state);

    // In development, be more lenient with state validation due to vercel dev cookie issues
    if (!storedState && process.env.NODE_ENV === 'development') {
      console.warn('Development mode: Skipping state validation due to cookie issues');
    } else if (!storedState || storedState !== state) {
      console.error('State mismatch:', { stored: storedState, received: state });
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent('Invalid state parameter')}`
      );
    }

    // Clear the state cookie
    cookieStore.delete('orcid-state');

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code, state);

    // Get user info from ORCID
    const userInfo = await getORCIDUserInfo(tokenResponse.access_token);

    // Create or update user in Supabase database
    const user = await createSupabaseUser(tokenResponse, userInfo);

    // Create admin client for session creation
    const { createServerClient } = await import('@supabase/ssr');
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        cookies: {
          getAll() {
            return [];
          },
          setAll(cookiesToSet) {
            // No-op for admin client
          },
        }
      }
    );

    // Create a server client for setting session cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Generate a session token for the user
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${request.nextUrl.origin}/dashboard`,
      },
    });

    if (sessionError) {
      console.error('Session generation failed:', sessionError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent('Failed to create session')}`
      );
    }

    // Extract tokens from the magic link and set session
    if (sessionData?.properties?.action_link) {
      const magicUrl = new URL(sessionData.properties.action_link);
      const hashParams = new URLSearchParams(magicUrl.hash.substring(1));

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!setSessionError) {
          // Redirect to success page
          return NextResponse.redirect(`${request.nextUrl.origin}/dashboard`);
        }
      }
    }

    // Fallback: redirect to the magic link directly
    if (sessionData?.properties?.action_link) {
      return NextResponse.redirect(sessionData.properties.action_link);
    }

    // Final fallback
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard`);
  } catch (error) {
    console.error('ORCID OAuth callback failed:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/auth/login?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed'
      )}`
    );
  }
}