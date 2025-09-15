import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('ORCID test route called');

  return NextResponse.json({
    message: 'ORCID test route working',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      ORCID_CLIENT_ID: process.env.ORCID_CLIENT_ID ? 'SET' : 'MISSING',
      ORCID_CLIENT_SECRET: process.env.ORCID_CLIENT_SECRET ? 'SET' : 'MISSING',
      ORCID_ENVIRONMENT: process.env.ORCID_ENVIRONMENT,
    }
  });
}