import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.READINN_API_URL ?? 'https://api.cypher.cl';

export async function POST(request: NextRequest) {
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json();
  const nextResponse = NextResponse.json(payload, { status: response.status });
  if (response.ok && payload.data?.token) {
    nextResponse.cookies.set('readinn_access', payload.data.token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60,
    });
    if (payload.data.refreshToken) {
      nextResponse.cookies.set('readinn_refresh', payload.data.refreshToken, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
      });
    }
  }
  return nextResponse;
}
