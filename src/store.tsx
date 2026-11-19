import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Configuration, type Product } from './api';
import { useAuth } from './auth';

type Store = {
  products: Product[];
  config: Configuration | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Store>({
  products: [],
  config: null,
  loading: false,
  error: null,
  refresh: async () => {},
});

const CACHE_KEY = 'sweetnation.cache';

type Cache = { products: Product[]; config: Configuration | null };

const readCache = (): Cache => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Cache;
  } catch {
    /* ignore */
  }
  return { products: [], config: null };
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cache, setCache] = useState<Cache>(readCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [products, config] = await Promise.all([
        api.products(user.user_id),
        api.configuration(user.user_id).catch(() => [] as Configuration[]),
      ]);
      const next = { products: products ?? [], config: config?.[0] ?? null };
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      setCache(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && cache.products.length === 0) void refresh();
  }, [user, cache.products.length, refresh]);

  const value = useMemo(
    () => ({ products: cache.products, config: cache.config, loading, error, refresh }),
    [cache, loading, error, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
