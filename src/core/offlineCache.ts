const CACHE_PREFIX = "electrostore-cache:";
const DEFAULT_TTL_MS = 1000 * 60 * 10; // 10 minutos

type StoredValue<T> = {
  timestamp: number;
  data: T;
};

const storage = typeof window !== "undefined" ? window.localStorage : null;

const cacheKey = (key: string) => `${CACHE_PREFIX}${key}`;

export const clearExpiredCache = () => {
  if (!storage) {
    return;
  }
  const now = Date.now();
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(CACHE_PREFIX)) {
      continue;
    }
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        storage.removeItem(key);
        continue;
      }
      const parsed = JSON.parse(raw) as StoredValue<unknown>;
      if (!parsed.timestamp || parsed.timestamp + DEFAULT_TTL_MS < now) {
        storage.removeItem(key);
      }
    } catch {
      storage.removeItem(key);
    }
  }
};

const readCache = <T>(key: string, ttl = DEFAULT_TTL_MS): T | null => {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(cacheKey(key));
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw) as StoredValue<T>;
    if (!stored || !stored.timestamp) {
      storage.removeItem(cacheKey(key));
      return null;
    }
    if (Date.now() - stored.timestamp > ttl) {
      storage.removeItem(cacheKey(key));
      return null;
    }
    return stored.data;
  } catch {
    storage.removeItem(cacheKey(key));
    return null;
  }
};

const writeCache = <T>(key: string, data: T) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(
      cacheKey(key),
      JSON.stringify({
        timestamp: Date.now(),
        data,
      } satisfies StoredValue<T>),
    );
  } catch {
    // Si fallamos al escribir (p. ej. storage lleno), limpiamos entradas antiguas.
    clearExpiredCache();
  }
};

const isOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

export interface CacheOptions {
  fallbackOnError?: boolean;
}

const removeCacheKey = (key: string) => {
  if (!storage) {
    return;
  }
  storage.removeItem(cacheKey(key));
};

export const invalidateCacheKeys = (...keys: string[]) => {
  keys.forEach(removeCacheKey);
};

export const fetchWithCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL_MS,
  options?: CacheOptions,
): Promise<T> => {
  const { fallbackOnError = true } = options ?? {};
  const fallback = () => readCache<T>(key, ttl);

  if (!isOnline()) {
    const cached = fallback();
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const data = await fetcher();
    writeCache(key, data);
    return data;
  } catch (error) {
    if (fallbackOnError) {
      const cached = fallback();
      if (cached !== null) {
        return cached;
      }
    }
    throw error;
  }
};
