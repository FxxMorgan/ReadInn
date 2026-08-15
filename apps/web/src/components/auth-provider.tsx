'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, login as loginRequest, logout as logoutRequest, register as registerRequest } from '@/lib/api';
import type { UserAccount } from '@/lib/types';

interface AuthContextValue {
  user: UserAccount | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; username: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await apiFetch<UserAccount>('/v1/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => setUser(await loginRequest(email, password)),
    register: async (input) => setUser(await registerRequest(input)),
    logout: async () => { await logoutRequest(); setUser(null); },
    refresh,
  }), [loading, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
