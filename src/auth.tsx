import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, type User } from './api';

const KEY = 'sweetnation.user';

type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} });

const readUser = (): User | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    if (!data || !data.user_id) throw new Error('Email atau password salah');
    localStorage.setItem(KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
