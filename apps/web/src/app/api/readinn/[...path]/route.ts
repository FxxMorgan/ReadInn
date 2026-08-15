import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.READINN_API_URL ?? 'https://api.cypher.cl';

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  let token = request.cookies.get('readinn_access')?.value;
  if (!token && context.params.path.join('/') === 'v1/auth/me') {
    return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'No hay una sesion activa.' } }, { status: 401 });
  }
  const target = new URL(`${API_URL}/${context.params.path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  let response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });
  let refreshedAccess: string | undefined;
  let refreshedRefresh: string | undefined;
  const refresh = request.cookies.get('readinn_refresh')?.value;
  if (response.status === 401 && refresh) {
    const refreshResponse = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }), cache: 'no-store',
    });
    if (refreshResponse.ok) {
      const payload = await refreshResponse.json();
      token = payload.data?.token;
      refreshedAccess = token;
      refreshedRefresh = payload.data?.refreshToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        response = await fetch(target, { method: request.method, headers, body, cache: 'no-store' });
      }
    }
  }
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });
  if (refreshedAccess) nextResponse.cookies.set('readinn_access', refreshedAccess, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 });
  if (refreshedRefresh) nextResponse.cookies.set('readinn_refresh', refreshedRefresh, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return nextResponse;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
