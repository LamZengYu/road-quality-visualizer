import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadToken, saveToken, clearToken } from '../storage/token';
import * as authApi from '../api/auth';

interface AuthState {
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(loadToken());
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    const { token } = await authApi.login(email, password);
    saveToken(token);
    setToken(token);
  }
  async function register(email: string, password: string) {
    const { token } = await authApi.register(email, password);
    saveToken(token);
    setToken(token);
  }
  function logout() {
    clearToken();
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
