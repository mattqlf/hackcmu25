import jwt from 'jsonwebtoken';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';

// ORCID OAuth endpoints - Production only
const ORCID_BASE_URL = 'https://orcid.org';

export const ORCID_ENDPOINTS = {
  authorize: `${ORCID_BASE_URL}/oauth/authorize`,
  token: `${ORCID_BASE_URL}/oauth/token`,
  userinfo: `${ORCID_BASE_URL}/oauth/userinfo`,
};

export interface ORCIDTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  orcid: string;
}

export interface ORCIDUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Generate CSRF state token
 */
export function generateState(): string {
  return crypto.randomUUID();
}

/**
 * Build ORCID authorization URL
 */
export function buildAuthorizationUrl(state: string, request?: Request): string {
  console.log('Environment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('ORCID_CLIENT_ID:', process.env.ORCID_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('ORCID_CLIENT_SECRET:', process.env.ORCID_CLIENT_SECRET ? 'SET' : 'MISSING');

  if (!process.env.ORCID_CLIENT_ID) {
    throw new Error('ORCID_CLIENT_ID environment variable is missing');
  }

  let baseUrl: string;

  if (process.env.NODE_ENV === 'development') {
    // For local development, use 127.0.0.1 as ORCID requires this
    baseUrl = 'http://127.0.0.1:3000';
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    baseUrl = 'https://hackcmu25.vercel.app';
  }

  const redirectUri = `${baseUrl}/api/auth/orcid/callback`;

  console.log('Base URL:', baseUrl);
  console.log('Redirect URI:', redirectUri);

  const params = new URLSearchParams({
    client_id: process.env.ORCID_CLIENT_ID!,
    response_type: 'code',
    scope: '/authenticate openid',
    redirect_uri: redirectUri,
    state: state,
  });

  const authUrl = `${ORCID_ENDPOINTS.authorize}?${params.toString()}`;
  console.log('Authorization URL:', authUrl);

  return authUrl;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string, state: string): Promise<ORCIDTokenResponse> {
  const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:3000'
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://hackcmu25.vercel.app';

  const redirectUri = `${baseUrl}/api/auth/orcid/callback`;

  const params = new URLSearchParams({
    client_id: process.env.ORCID_CLIENT_ID!,
    client_secret: process.env.ORCID_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(ORCID_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get ORCID user info
 */
export async function getORCIDUserInfo(accessToken: string): Promise<ORCIDUserInfo> {
  const response = await fetch(ORCID_ENDPOINTS.userinfo, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get user info: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Create or update user in Supabase
 */
export async function createSupabaseUser(orcidData: ORCIDTokenResponse, userInfo: ORCIDUserInfo) {
  // Create admin client with service role key
  const supabase = await createClient();

  // Create service role client for admin operations
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

  const email = userInfo.email || `${orcidData.orcid}@orcid.placeholder`;
  const fullName = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || orcidData.orcid;

  // First, check if user already exists by searching for them
  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existingUser = usersData.users?.find(u => u.email === email);

  let userId: string;
  let authUser: any = null;

  if (existingUser) {
    // User already exists, use their ID
    userId = existingUser.id;
    authUser = { user: existingUser };
    console.log('Found existing user with ID:', userId);

    // Update their user metadata with ORCID info
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: fullName,
        orcid_id: orcidData.orcid,
        provider: 'orcid',
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
      },
    });

    if (updateError) {
      console.warn('Failed to update user metadata:', updateError);
    }
  } else {
    // Create new user
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        given_name: userInfo.given_name,
        family_name: userInfo.family_name,
        orcid_id: orcidData.orcid,
        provider: 'orcid',
      },
    });

    if (authError) {
      throw authError;
    }

    userId = newAuthUser.user!.id;
    authUser = newAuthUser;
    console.log('Created new user with ID:', userId);
  }

  // Update or create user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: fullName,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (profileError) {
    console.warn('Profile creation warning:', profileError);
  }

  return {
    id: userId,
    email: email,
    full_name: fullName,
    orcid_id: orcidData.orcid,
  };
}

/**
 * Generate JWT token for Supabase authentication
 */
export function generateSupabaseJWT(user: any): string {
  const payload = {
    sub: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_verified: user.email_verified,
    user_metadata: {
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      orcid_id: user.orcid_id,
    },
    app_metadata: {
      provider: 'orcid',
      providers: ['orcid'],
    },
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, {
    algorithm: 'HS256',
  });
}