/**
 * React hook for streaming data from Bunbox API
 */

import { useState, useEffect, useCallback, useRef } from "react";

export type UseStreamOptions<TParams, TQuery, TBody> = {
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  headers?: HeadersInit;
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
};

export type UseStreamResult<TResponse> = {
  data: TResponse[];
  latest: TResponse | null;
  loading: boolean;
  error: Error | undefined;
  start: () => Promise<void>;
  abort: () => void;
};

type ApiMethodFunction = (opts?: any) => Promise<AsyncIterable<any>>;

export function useStream<TResponse, TParams = any, TQuery = any, TBody = any>(
  apiMethod: ApiMethodFunction,
  opts?: UseStreamOptions<TParams, TQuery, TBody>
): UseStreamResult<TResponse> {
  const [data, setData] = useState<TResponse[]>([]);
  const [latest, setLatest] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const start = useCallback(async () => {
    abort();

    setLoading(true);
    setError(undefined);
    setData([]);
    setLatest(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const iterable = await apiMethod({
        ...optsRef.current,
        headers: {
          ...optsRef.current?.headers,
          signal: controller.signal,
        },
      });

      for await (const message of iterable) {
        if (controller.signal.aborted) break;

        const typedMessage = message as TResponse;
        setLatest(typedMessage);
        setData((prev) => [...prev, typedMessage]);
        optsRef.current?.onMessage?.(typedMessage);
      }

      if (!controller.signal.aborted) {
        optsRef.current?.onFinish?.();
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      optsRef.current?.onError?.(errorObj);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [apiMethod, abort]);

  useEffect(() => {
    const shouldAutoStart = opts?.enabled !== false;
    if (shouldAutoStart) {
      start();
    }
    return abort;
  }, [start, abort, opts?.enabled]);

  return {
    data,
    latest,
    loading,
    error,
    start,
    abort,
  };
}
