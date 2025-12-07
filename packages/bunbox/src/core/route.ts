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
  StreamingResponse,
  SSEResponse,
} from "./types";
import {
  ValidationError,
  ApiError,
  problemResponse,
  type FieldError,
} from "./errors";

/**
 * HTTP methods supported by route handlers
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

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

/**
 * Internal helper to create streaming responses
 */
function createStreamingResponse<T>(
  generator: AsyncGenerator<T> | (() => AsyncGenerator<T>),
  transform: (value: T) => string | Uint8Array,
  headers: Record<string, string>,
  init?: ResponseInit
): Response {
  const iterator = typeof generator === "function" ? generator() : generator;

  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(transform(value));
    },
  });

  const responseHeaders = new Headers(init?.headers || {});
  for (const [key, value] of Object.entries(headers)) {
    responseHeaders.set(key, value);
  }

  return new Response(stream, { ...init, headers: responseHeaders });
}

/**
 * Create a streaming response from an async generator
 */
export function stream<T>(
  generator:
    | AsyncGenerator<string | Uint8Array>
    | (() => AsyncGenerator<string | Uint8Array>),
  init?: ResponseInit
): StreamingResponse<T> {
  return createStreamingResponse(
    generator,
    (value) => value,
    {
      "Content-Type": "text/plain",
      "X-Bunbox-Stream": "1",
    },
    init
  ) as StreamingResponse<T>;
}

/**
 * Create a Server-Sent Events (SSE) response from an async generator
 */
export function sse<T>(
  generator: AsyncGenerator<T> | (() => AsyncGenerator<T>),
  init?: ResponseInit
): SSEResponse<T> {
  const encoder = new TextEncoder();
  return createStreamingResponse(
    generator,
    (value) => encoder.encode(`data: ${JSON.stringify(value)}\n\n`),
    {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
    init
  ) as SSEResponse<T>;
}

/**
 * Check if an error is a Zod-like validation error
 */
function isZodError(
  error: unknown
): error is { issues: Array<{ path: (string | number)[]; code: string; message: string; expected?: string; received?: string }> } {
  return (
    error !== null &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}

/**
 * Helper to define middleware with full type inference
 * Provides typed ctx and infers return type for context extension
 *
 * @example
 * const auth = defineMiddleware(async (ctx) => {
 *   const token = ctx.headers.get('authorization');
 *   if (!token) return error('Unauthorized', 401);
 *   return { user: await verifyToken(token) };
 * });
 */
export function defineMiddleware<Extra extends RouteExtras | void = void>(
  fn: (
    ctx: RouteContext
  ) => Extra | void | Response | Promise<Extra | void | Response>
): Middleware<RouteContext, Extra> {
  return fn;
}

/**
 * Route handler with attached type metadata and HTTP method
 * Used by the client generator to extract types
 */
type HandlerWithTypes<TParams, TQuery, TBody, TResponse> = RouteHandler & {
  __types: {
    params: TParams;
    query: TQuery;
    body: TBody;
    response: TResponse;
  };
  __method: HttpMethod;
  __meta?: RouteMeta;
  __schemas?: {
    params?: Validator<unknown>;
    query?: Validator<unknown>;
    body?: Validator<unknown>;
  };
};

type RuntimeContext = RouteContext<
  RouteParams,
  RouteQuery,
  unknown,
  RouteExtras
>;

type RuntimeMiddleware = Middleware<RuntimeContext, RouteExtras | void>;

/**
 * Hook function executed before the handler
 * Can short-circuit by returning a Response
 */
export type BeforeHook<TCtx extends RouteExtras = EmptyExtras> = (
  ctx: RouteContext<RouteParams, RouteQuery, unknown, TCtx>
) => void | Response | Promise<void | Response>;

/**
 * Hook function executed after the handler
 * Can transform the response
 */
export type AfterHook<TCtx extends RouteExtras = EmptyExtras> = (
  ctx: RouteContext<RouteParams, RouteQuery, unknown, TCtx>,
  response: Response
) => Response | Promise<Response>;

/**
 * Route metadata for OpenAPI documentation
 */
export interface RouteMeta {
  /** Short summary of the operation */
  summary?: string;
  /** Longer description of the operation */
  description?: string;
  /** Tags for grouping operations */
  tags?: string[];
  /** Unique operation identifier */
  operationId?: string;
  /** Mark operation as deprecated */
  deprecated?: boolean;
  /** Response descriptions by status code */
  responses?: Record<number, { description: string }>;
}

interface BuilderInternals<TParams, TQuery, TBody> {
  readonly method?: HttpMethod;
  readonly middlewares: ReadonlyArray<RuntimeMiddleware>;
  readonly beforeHooks: ReadonlyArray<BeforeHook>;
  readonly afterHooks: ReadonlyArray<AfterHook>;
  readonly params?: Validator<TParams>;
  readonly query?: Validator<TQuery>;
  readonly body?: Validator<TBody>;
  readonly meta?: RouteMeta;
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
    // Extract field-level errors from Zod-like validation errors
    if (isZodError(error)) {
      const fieldErrors: FieldError[] = error.issues.map((issue) => ({
        field: `${field}${issue.path.length > 0 ? "." + issue.path.join(".") : ""}`,
        code: issue.code,
        message: issue.message,
        expected: issue.expected,
        received: issue.received,
      }));
      throw new ValidationError(fieldErrors);
    }

    // Fallback for non-Zod validation errors
    throw new ValidationError([
      {
        field,
        code: "invalid",
        message: error instanceof Error ? error.message : "Validation failed",
      },
    ]);
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
      beforeHooks: [],
      afterHooks: [],
    }
  ) {}

  /**
   * Create a GET route handler
   */
  get(): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      method: "GET",
    });
  }

  /**
   * Create a POST route handler
   */
  post(): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      method: "POST",
    });
  }

  /**
   * Create a PUT route handler
   */
  put(): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      method: "PUT",
    });
  }

  /**
   * Create a DELETE route handler
   */
  delete(): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      method: "DELETE",
    });
  }

  /**
   * Create a PATCH route handler
   */
  patch(): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      method: "PATCH",
    });
  }

  /**
   * Add a before hook that runs before middleware and validation
   * Can short-circuit by returning a Response
   */
  before(
    hook: BeforeHook<TCtx>
  ): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      beforeHooks: [...this.internals.beforeHooks, hook as BeforeHook],
    });
  }

  /**
   * Add an after hook that runs after the handler
   * Can transform the response
   */
  after(
    hook: AfterHook<TCtx>
  ): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      afterHooks: [...this.internals.afterHooks, hook as AfterHook],
    });
  }

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

  /**
   * Add OpenAPI metadata to the route
   */
  meta(metadata: RouteMeta): RouteBuilder<TParams, TQuery, TBody, TCtx> {
    return new RouteBuilder<TParams, TQuery, TBody, TCtx>({
      ...this.internals,
      meta: { ...this.internals.meta, ...metadata },
    });
  }

  handle<TResult>(
    handler: (
      ctx: RouteContext<TParams, TQuery, TBody, TCtx>
    ) => TResult | Response | Promise<TResult | Response>
  ): HandlerWithTypes<TParams, TQuery, TBody, Awaited<TResult>> {
    // Require HTTP method to be specified
    if (!this.internals.method) {
      throw new Error(
        "HTTP method must be specified. Use route.get(), route.post(), etc. before .handle()"
      );
    }

    const method = this.internals.method;
    const beforeHooks = this.internals.beforeHooks;
    const afterHooks = this.internals.afterHooks;

    const routeHandler: RouteHandler = async (req: BunboxRequest) => {
      try {
        // Build initial context for before hooks (pre-validation)
        let ctx: RouteContext<TParams, TQuery, TBody, TCtx> = {
          ...req,
          params: req.params as TParams,
          query: req.query as TQuery,
          body: req.body as TBody,
          json: <T>(data: T, init?: number | ResponseInit) => json(data, init),
        } as RouteContext<TParams, TQuery, TBody, TCtx>;

        // Run before hooks (can short-circuit)
        for (const hook of beforeHooks) {
          const result = await hook(ctx as unknown as RouteContext);
          if (result instanceof Response) {
            return result;
          }
        }

        // Run validation after before hooks
        const params = runValidator(
          this.internals.params,
          req.params,
          "params"
        );
        const query = runValidator(this.internals.query, req.query, "query");
        const body = runValidator(this.internals.body, req.body, "body");

        // Update context with validated data
        ctx = {
          ...ctx,
          params,
          query,
          body,
        } as RouteContext<TParams, TQuery, TBody, TCtx>;

        // Apply middleware and merge returned context
        for (const middleware of this.internals.middlewares) {
          const result = await middleware(ctx as RuntimeContext);

          // Middleware returned Response = short-circuit (auth failure, etc.)
          if (result instanceof Response) {
            return result;
          }

          // Merge context extras
          if (result && typeof result === "object") {
            ctx = { ...ctx, ...result } as RouteContext<
              TParams,
              TQuery,
              TBody,
              TCtx
            >;
          }
        }

        // Run the handler
        const result = await handler(ctx);
        let response: Response;
        if (result instanceof Response) {
          response = result;
        } else {
          response = ctx.json(result);
        }

        // Run after hooks (can transform response)
        for (const hook of afterHooks) {
          response = await hook(ctx as unknown as RouteContext, response);
        }

        return response;
      } catch (err) {
        // Handle structured API errors
        if (err instanceof ApiError) {
          return err.toResponse();
        }

        // Handle validation errors with field details
        if (err instanceof ValidationError) {
          return err.toResponse();
        }

        // Generic error handling
        const message = err instanceof Error ? err.message : "Internal error";
        console.error(`Route error: ${message}`);
        return problemResponse(message, 500);
      }
    };

    // Attach method metadata to the handler
    const typedHandler = routeHandler as HandlerWithTypes<
      TParams,
      TQuery,
      TBody,
      Awaited<TResult>
    >;
    typedHandler.__method = method;
    typedHandler.__meta = this.internals.meta;
    typedHandler.__schemas = {
      params: this.internals.params,
      query: this.internals.query,
      body: this.internals.body,
    };

    return typedHandler;
  }
}

export const route = new RouteBuilder();
