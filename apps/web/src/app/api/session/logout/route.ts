import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ data: { success: true } });
  response.cookies.set('readinn_access', '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set('readinn_refresh', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
