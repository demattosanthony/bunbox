/**
 * Route utilities for Bunbox
 */

import type {
  BunboxRequest,
  RouteContext,
  RouteHandler,
  Middleware,
  Validator,
  RouteExtras,
  RouteParams,
  RouteQuery,
  EmptyExtras,
} from "./types";

/**
 * Helper to create JSON responses with optional init object
 */
export function json<T>(data: T, init: number | ResponseInit = 200): Response {
  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init } : { status: 200, ...init };

  const headers = new Headers(responseInit.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  });
}

/**
 * Error response helper
 */
export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

class ValidationError extends Error {
  constructor(field: string, details: unknown) {
    super(
      `Invalid ${field}${
        details instanceof Error ? `: ${details.message}` : ""
      }`
    );
  }
}

type HandlerWithTypes<TParams, TQuery, TBody, TResponse> = RouteHandler & {
  __types: {
    params: TParams;
    query: TQuery;
    body: TBody;
    response: TResponse;
  };
};

type RuntimeContext = RouteContext<
  RouteParams,
  RouteQuery,
  unknown,
  RouteExtras
>;

type RuntimeMiddleware = Middleware<RuntimeContext, RouteExtras | void>;

interface BuilderInternals<TParams, TQuery, TBody> {
  readonly middlewares: ReadonlyArray<RuntimeMiddleware>;
  readonly params?: Validator<TParams>;
  readonly query?: Validator<TQuery>;
  readonly body?: Validator<TBody>;
}

function runValidator<T>(
  schema: Validator<T> | undefined,
  value: unknown,
  field: "params" | "query" | "body"
): T {
  if (!schema) return value as T;
  try {
    return schema.parse(value);
  } catch (error) {
    throw new ValidationError(field, error);
  }
}

type NextExtras<
  Current extends RouteExtras,
  Extra extends RouteExtras | void
> = Extra extends void ? Current : Current & Extra;

class RouteBuilder<
  TParams extends Record<string, unknown> = RouteParams,
  TQuery extends Record<string, unknown> = RouteQuery,
  TBody = unknown,
  TCtx extends RouteExtras = EmptyExtras
> {
  constructor(
    private readonly internals: BuilderInternals<TParams, TQuery, TBody> = {
      middlewares: [],
    }
  ) {}

  use<Extra extends RouteExtras | void = void>(
    middleware: Middleware<RouteContext<TParams, TQuery, TBody, TCtx>, Extra>
  ): RouteBuilder<TParams, TQuery, TBody, NextExtras<TCtx, Extra>> {
    const runtime = middleware as unknown as RuntimeMiddleware;
    return new RouteBuilder<TParams, TQuery, TBody, NextExtras<TCtx, Extra>>({
      ...this.internals,
      middlewares: [...this.internals.middlewares, runtime],
    });
  }

  params<NextParams extends Record<string, unknown>>(
    schema: Validator<NextParams>
  ): RouteBuilder<NextParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<NextParams, TQuery, TBody, TCtx>({
      ...this.internals,
      params: schema,
    });
  }

  query<NextQuery extends Record<string, unknown>>(
    schema: Validator<NextQuery>
  ): RouteBuilder<TParams, NextQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, NextQuery, TBody, TCtx>({
      ...this.internals,
      query: schema,
    });
  }

  body<NextBody>(
    schema: Validator<NextBody>
  ): RouteBuilder<TParams, TQuery, NextBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, NextBody, TCtx>({
      ...this.internals,
      body: schema,
    });
  }

  handle<TResult>(
    handler: (
      ctx: RouteContext<TParams, TQuery, TBody, TCtx>
    ) => TResult | Response | Promise<TResult | Response>
  ): HandlerWithTypes<TParams, TQuery, TBody, Awaited<TResult>> {
    const routeHandler: RouteHandler = async (req: BunboxRequest) => {
      try {
        const params = runValidator(
          this.internals.params,
          req.params,
          "params"
        );
        const query = runValidator(this.internals.query, req.query, "query");
        const body = runValidator(this.internals.body, req.body, "body");

        // Build context by merging validated inputs with request
        let ctx: RouteContext<TParams, TQuery, TBody, TCtx> = {
          ...req,
          params,
          query,
          body,
          json: <T>(data: T, init?: number | ResponseInit) => json(data, init),
        } as RouteContext<TParams, TQuery, TBody, TCtx>;

        // Apply middleware and merge returned context
        for (const middleware of this.internals.middlewares) {
          const extra = await middleware(ctx as RuntimeContext);
          if (extra && typeof extra === "object") {
            ctx = { ...ctx, ...extra } as RouteContext<
              TParams,
              TQuery,
              TBody,
              TCtx
            >;
          }
        }

        const result = await handler(ctx);
        if (result instanceof Response) {
          return result;
        }
        return ctx.json(result);
      } catch (err) {
        if (err instanceof ValidationError) {
          return error(err.message, 400);
        }
        const message = err instanceof Error ? err.message : "Internal error";
        console.error(`Route error: ${message}`);
        return error(message, 500);
      }
    };

    return routeHandler as HandlerWithTypes<
      TParams,
      TQuery,
      TBody,
      Awaited<TResult>
    >;
  }
}

export const route = new RouteBuilder();
