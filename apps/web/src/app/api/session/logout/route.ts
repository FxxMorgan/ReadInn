import { NextResponse } from 'next/server';

const API_URL = process.env.READINN_API_URL ?? 'https://api.cypher.cl';

export async function POST(request: Request) {
  const refreshToken = request.headers.get('cookie')?.match(/(?:^|; )readinn_refresh=([^;]+)/)?.[1];
  if (refreshToken) {
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: decodeURIComponent(refreshToken) }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ data: { success: true } });
  response.cookies.set('readinn_access', '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set('readinn_refresh', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
