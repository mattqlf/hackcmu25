import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateState, buildAuthorizationUrl } from '@/lib/orcid-auth';

export async function GET(request: NextRequest) {
  console.log('ORCID OAuth route called');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  try {
    // Generate CSRF state token
    const state = generateState();
    console.log('Generated state token:', state);

    // Store state in secure cookie for validation
    const cookieStore = await cookies();
    cookieStore.set('orcid-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    console.log('State cookie set with value:', state);

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(state, request);
    console.log('Built auth URL:', authUrl);

    // Validate the URL before redirecting
    try {
      new URL(authUrl);
      console.log('Auth URL is valid');
    } catch (urlError) {
      console.error('Invalid auth URL:', urlError);
      throw new Error('Generated invalid authorization URL');
    }

    // Redirect to ORCID
    console.log('Redirecting to ORCID...');
    const response = NextResponse.redirect(authUrl);
    console.log('Redirect response created');
    return response;
  } catch (error) {
    console.error('ORCID OAuth initiation failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return JSON error for debugging instead of redirect
    return NextResponse.json({
      error: 'ORCID OAuth initiation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        ORCID_CLIENT_ID: process.env.ORCID_CLIENT_ID ? 'SET' : 'MISSING',
        ORCID_CLIENT_SECRET: process.env.ORCID_CLIENT_SECRET ? 'SET' : 'MISSING',
        ORCID_ENVIRONMENT: process.env.ORCID_ENVIRONMENT,
      }
    }, { status: 500 });
  }
}