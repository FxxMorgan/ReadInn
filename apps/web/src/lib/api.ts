import type { UserAccount } from './types';

const API_BASE = process.env.NEXT_PUBLIC_READINN_API_URL ?? '/api/readinn';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.message ?? 'No pudimos completar la solicitud.');
  }
  return payload.data as T;
}

export async function login(email: string, password: string): Promise<UserAccount> {
  const response = await fetch('/api/session/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload?.error?.message ?? 'No pudimos iniciar sesion.');
  return payload.data.user as UserAccount;
}

export async function register(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<UserAccount> {
  const response = await fetch('/api/session/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload?.error?.message ?? 'No pudimos crear la cuenta.');
  return payload.data.user as UserAccount;
}

export async function logout(): Promise<void> {
  await fetch('/api/session/logout', { method: 'POST', credentials: 'include' });
}
