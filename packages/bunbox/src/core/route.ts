/**
 * Route definition utilities for Bunbox
 * Provides type-safe route handlers with automatic validation
 */

import type { Schema, ValidationResult } from "./schema";
import type { BunboxRequest } from "./types";

export interface RouteDefinition<
  TParams = Record<string, string>,
  TQuery = Record<string, string>,
  TBody = any,
  TResponse = any
> {
  params?: Schema<TParams>;
  query?: Schema<TQuery>;
  body?: Schema<TBody>;
  response?: Schema<TResponse>;
  handler: (req: {
    params: TParams;
    query: TQuery;
    body: TBody;
    raw: BunboxRequest;
  }) => TResponse | Promise<TResponse>;
}

/**
 * JSON response helper
 */
export function json<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/**
 * Error response helper
 */
export function error(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

/**
 * Typed route handler with schema information attached
 */
export interface TypedRouteHandler<
  TParams = any,
  TQuery = any,
  TBody = any,
  TResponse = any
> {
  (req: BunboxRequest): Promise<Response>;
  __definition?: RouteDefinition<TParams, TQuery, TBody, TResponse>;
}

/**
 * Validate a field with a schema
 */
function validateField<T>(
  schema: Schema<T> | undefined,
  value: any,
  fieldName: string
): { data: T; error?: Response } {
  if (!schema) return { data: value as T };

  const result = schema.validate(value);
  if (!result.success) {
    return {
      data: value,
      error: error(`Invalid ${fieldName}: ${result.error}`, 400),
    };
  }
  return { data: result.data! };
}

/**
 * Define a typed API route with automatic validation
 */
export function defineRoute<
  TParams = Record<string, string>,
  TQuery = Record<string, string>,
  TBody = any,
  TResponse = any
>(
  definition: RouteDefinition<TParams, TQuery, TBody, TResponse>
): TypedRouteHandler<TParams, TQuery, TBody, TResponse> {
  const handler = async (req: BunboxRequest): Promise<Response> => {
    try {
      // Validate request fields
      const params = validateField(definition.params, req.params, "params");
      if (params.error) return params.error;

      const query = validateField(definition.query, req.query, "query");
      if (query.error) return query.error;

      const body = validateField(definition.body, req.body, "body");
      if (body.error) return body.error;

      // Call handler
      const responseData = await definition.handler({
        params: params.data,
        query: query.data,
        body: body.data,
        raw: req,
      });

      // Validate response
      if (definition.response) {
        const result = definition.response.validate(responseData);
        if (!result.success && process.env.NODE_ENV !== "production") {
          console.error(
            `Response validation failed: ${result.error}`,
            responseData
          );
        }
        return json(result.success ? result.data : responseData);
      }

      return json(responseData);
    } catch (err) {
      console.error("Route handler error:", err);
      return error(
        err instanceof Error ? err.message : "Internal Server Error",
        500
      );
    }
  };

  handler.__definition = definition;
  return handler as TypedRouteHandler<TParams, TQuery, TBody, TResponse>;
}
