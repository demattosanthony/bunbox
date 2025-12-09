/**
 * React hooks for data fetching with the Bunbox API client
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type UseQueryOptions<TParams, TQuery, TBody> = {
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  headers?: HeadersInit;
  enabled?: boolean; // default true
};

export type UseQueryResult<TResponse> = {
  data: TResponse | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
};

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<any>>();

/**
 * Generate a cache key from request details
 */
function getCacheKey(
  method: string,
  path: string,
  opts?: Record<string, any>
): string {
  return JSON.stringify({ method, path, opts });
}

/**
 * Get cached data if available
 */
function getCachedData<T>(cacheKey: string): T | undefined {
  const entry = queryCache.get(cacheKey);
  return entry?.data;
}

/**
 * Set cached data
 */
function setCachedData<T>(cacheKey: string, data: T): void {
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear all cached data
 */
export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearQueryCacheKey(
  method: string,
  path: string,
  opts?: Record<string, any>
): void {
  const cacheKey = getCacheKey(method, path, opts);
  queryCache.delete(cacheKey);
}

/**
 * Build request URL with params and query string
 */
function buildRequestUrl(
  path: string,
  opts?: { params?: Record<string, unknown>; query?: Record<string, unknown> }
): string {
  let url = path;

  // Handle params (replace [param] with actual value)
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      url = url.replace(`[${k}]`, String(v));
    }
  }

  // Handle query params
  if (opts?.query) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) {
        p.append(k, String(v));
      }
    }
    const queryString = p.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Make the request relative in browser, absolute on server
  if (url.startsWith("/") && typeof window === "undefined") {
    url = `http://${process.env.BUNBOX_HOSTNAME || "localhost"}:${
      process.env.BUNBOX_PORT || "3000"
    }${url}`;
  }

  return url;
}

/**
 * Execute fetch with standard options
 */
function executeFetch(
  url: string,
  method: string,
  opts?: { body?: unknown; headers?: HeadersInit }
): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
    body:
      opts?.body && method !== "GET" ? JSON.stringify(opts.body) : undefined,
  });
}

/**
 * Create a query hook for an API function
 * This is used internally by the generated API client
 */
export function createQueryHook<TResponse>(
  method: string,
  path: string,
  opts?: UseQueryOptions<any, any, any>
): UseQueryResult<TResponse> {
  const enabled = opts?.enabled !== false;

  // Use refs to store latest values without triggering re-renders
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Create a stable key based on the serialized request parameters
  // Only changes when actual values change, not when object references change
  const requestKey = `${method}:${path}:${JSON.stringify(
    opts?.params || {}
  )}:${JSON.stringify(opts?.query || {})}:${JSON.stringify(opts?.body || {})}`;

  const [data, setData] = useState<TResponse | undefined>(() => {
    // Try to get cached data on mount
    return getCachedData<TResponse>(requestKey);
  });
  const [loading, setLoading] = useState<boolean>(enabled && !data);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Use ref to track if component is mounted
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      // Check cache first
      const cached = getCachedData<TResponse>(requestKey);
      if (cached && !cancelled) {
        setData(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const currentOpts = optsRef.current;
        const url = buildRequestUrl(path, currentOpts);
        const res = await executeFetch(url, method, currentOpts);

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const result = await res.json();

        // Only update state if not cancelled and component is still mounted
        if (!cancelled && mountedRef.current) {
          setData(result);
          setError(undefined);
          setCachedData(requestKey, result);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setError(errorObj);
          setData(undefined);
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [method, path, requestKey, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    // Clear cache for this key before refetching
    queryCache.delete(requestKey);

    setLoading(true);
    setError(undefined);

    try {
      const currentOpts = optsRef.current;
      const url = buildRequestUrl(path, currentOpts);
      const res = await executeFetch(url, method, currentOpts);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = await res.json();

      if (mountedRef.current) {
        setData(result);
        setError(undefined);
        setCachedData(requestKey, result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setData(undefined);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [method, path, requestKey, enabled]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
