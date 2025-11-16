/**
 * Minimal route utilities for Bunbox
 */

import type { BunboxRequest } from "./types";

/**
 * JSON response helper
 */
export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Error response helper
 */
export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/**
 * Minimal typed route handler with full type parameters
 * Usage: api<Params, Query, Body, Response>((req) => ({ ... }))
 */
export function api<TParams = any, TQuery = any, TBody = any, TResponse = any>(
  handler: (req: BunboxRequest) => TResponse | Promise<TResponse>
): ((req: BunboxRequest) => Promise<Response>) & {
  __types: { params: TParams; query: TQuery; body: TBody; response: TResponse };
} {
  const routeHandler = async (req: BunboxRequest) => {
    try {
      const data = await handler(req);
      return json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      console.error(`Route error: ${message}`);
      return error(message, 500);
    }
  };

  // Attach type markers (not used at runtime, just for inference)
  return routeHandler as any;
}
