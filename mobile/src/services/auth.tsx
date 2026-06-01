import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadToken, saveToken, clearToken } from '../storage/token';
import { initApiBaseUrl } from '../api/client';
import * as authApi from '../api/auth';

interface AuthState {
  token: string | null;
  ready: boolean; // true once we've finished reading storage at startup
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Load the saved backend URL BEFORE we use the saved token, so the first
      // authenticated request hits the right server.
      await initApiBaseUrl();
      const t = await loadToken();
      setToken(t);
      setReady(true);
    })();
  }, []);

  async function login(email: string, password: string) {
    const { token: t } = await authApi.login(email, password);
    await saveToken(t);
    setToken(t);
  }
  async function register(email: string, password: string) {
    const { token: t } = await authApi.register(email, password);
    await saveToken(t);
    setToken(t);
  }
  async function logout() {
    await clearToken();
    setToken(null);
  }

  return (
    <AuthCtx.Provider value={{ token, ready, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
