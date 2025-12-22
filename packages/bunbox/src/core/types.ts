/**
 * Core type definitions for Bunbox
 * Centralized types used across the framework
 */

import type React from "react";
import type { Server } from "bun";

export type RouteParams = Record<string, string>;
export type RouteQuery = Record<string, string>;
export type RouteExtras = Record<string, unknown>;
export type EmptyExtras = Record<string, never>;

/**
 * Generic validation interface (compatible with Zod/Valibot/etc.)
 */
export interface Validator<T> {
  parse: (input: unknown) => T;
}

/**
 * Middleware function signature used by RouteBuilder
 * Can return context extras, void, or a Response for early exit
 */
export type Middleware<Ctx, Extra extends RouteExtras | void = void> = (
  ctx: Ctx
) => Extra | void | Response | Promise<Extra | void | Response>;

/**
 * Route handler context exposed to developers
 */
export type RouteContext<
  Params extends Record<string, unknown> = RouteParams,
  Query extends Record<string, unknown> = RouteQuery,
  Body = unknown,
  Extras extends RouteExtras = EmptyExtras
> = BunboxRequest &
  Extras & {
    params: Params;
    query: Query;
    body: Body;
    json: <T>(data: T, init?: number | ResponseInit) => Response;
  };

/**
 * Open Graph image with optional dimensions and alt text
 */
export interface OpenGraphImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Open Graph metadata for social sharing
 * @see https://ogp.me/
 */
export interface OpenGraphMetadata {
  /** og:title - Falls back to page title */
  title?: string;
  /** og:description - Falls back to page description */
  description?: string;
  /** og:image - URL or image object with dimensions */
  image?: string | OpenGraphImage;
  /** og:url - Auto-generated from metadataBase + pathname if not set */
  url?: string;
  /** og:type - Defaults to "website" */
  type?: "website" | "article" | "product" | "profile" | string;
  /** og:site_name - Name of the overall site */
  siteName?: string;
  /** og:locale - e.g., "en_US" */
  locale?: string;
}

/**
 * Twitter Card metadata
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup
 */
export interface TwitterMetadata {
  /** twitter:card type - Defaults to "summary_large_image" */
  card?: "summary" | "summary_large_image" | "player" | "app";
  /** twitter:title - Falls back to og:title, then page title */
  title?: string;
  /** twitter:description - Falls back to og:description, then page description */
  description?: string;
  /** twitter:image - Falls back to og:image */
  image?: string | { url: string; alt?: string };
  /** twitter:site - @username of the website */
  site?: string;
  /** twitter:creator - @username of content creator */
  creator?: string;
}

/**
 * Page metadata for HTML head tags
 */
export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  viewport?: string;
  favicon?: string;
  /** Base URL for resolving relative URLs in openGraph and twitter metadata */
  metadataBase?: string;
  /** Open Graph metadata for social sharing */
  openGraph?: OpenGraphMetadata;
  /** Twitter Card metadata */
  twitter?: TwitterMetadata;
}

/**
 * Route match result with extracted params and query
 */
export interface RouteMatch {
  params: Record<string, string>;
  query: Record<string, string>;
}

/**
 * Route configuration
 */
export interface Route {
  pattern: RegExp;
  filepath: string;
  paramNames: string[];
  type: "page" | "api" | "ws";
}

/**
 * Extended Request with route params, query, and parsed body
 * Available in API route handlers
 */
export type BunboxRequest = Omit<Request, "body"> & {
  params: RouteParams;
  query: RouteQuery;
  body: unknown;
};

/**
 * API route handler function signature
 * Used for route method exports: GET, POST, PUT, DELETE, PATCH
 * Request is extended with params and query properties at runtime
 */
export type RouteHandler = (req: BunboxRequest) => Response | Promise<Response>;

// Schema types removed - use Zod or other validation libraries directly

/**
 * WebSocket handler for real-time connections
 * Based on Bun's ServerWebSocket with full API access
 */
export interface ServerWebSocket {
  send: (data: string | ArrayBuffer | Uint8Array, compress?: boolean) => number;
  close: (code?: number, reason?: string) => void;
  data: unknown;
  readonly readyState: number;
  readonly remoteAddress: string;
  readonly subscriptions: string[];
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  publish: (
    topic: string,
    data: string | ArrayBuffer | Uint8Array,
    compress?: boolean
  ) => number;
  isSubscribed: (topic: string) => boolean;
  cork: (cb: (ws: ServerWebSocket) => void) => void;
}

/**
 * WebSocket context passed to route handlers
 * Provides convenient access to broadcasting and route information
 */
export interface WebSocketContext {
  /** Route topic (auto-subscribed) e.g., "ws-chat" */
  readonly topic: string;
  /** Broadcast to all subscribers on this route (includes sender) */
  broadcast(
    data: string | ArrayBuffer | Uint8Array,
    compress?: boolean
  ): number;
  /** Broadcast JSON data to all subscribers on this route (includes sender) */
  broadcastJSON(data: unknown, compress?: boolean): number;
}

/**
 * WebSocket route module with named function exports
 */
export interface WsRouteModule {
  upgrade?: (
    req: Request
  ) => boolean | { data?: unknown } | Promise<boolean | { data?: unknown }>;
  onOpen?: (ws: ServerWebSocket, ctx: WebSocketContext) => void | Promise<void>;
  onMessage?: (
    ws: ServerWebSocket,
    message: string | Buffer,
    ctx: WebSocketContext
  ) => void | Promise<void>;
  onClose?: (
    ws: ServerWebSocket,
    ctx: WebSocketContext,
    code?: number,
    reason?: string
  ) => void | Promise<void>;
}

/**
 * WebSocket data attached to connections
 */
export type WebSocketData =
  | {
      type: "hmr";
    }
  | {
      type: "ws";
      route: string;
      topic: string;
      handler: WsRouteModule;
      ctx: WebSocketContext;
      /** Custom data from upgrade function */
      data?: unknown;
    };

/**
 * Page component props with route params, query, and loader data
 */
export interface PageProps {
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
}

/**
 * Context passed to page loader functions
 */
export interface LoaderContext {
  params: Record<string, string>;
  query: Record<string, string>;
  context: Record<string, unknown>;
}

/**
 * Page module with React component and optional loader
 */
export interface PageModule {
  default: React.ComponentType<PageProps>;
  metadata?: PageMetadata;
  loader?: (context: LoaderContext) => unknown | Promise<unknown>;
}

/**
 * Layout module with React component
 */
export interface LayoutModule {
  default: React.ComponentType<{ children: React.ReactNode }>;
  metadata?: PageMetadata;
}

/**
 * Context passed to middleware functions
 */
export interface MiddlewareContext {
  request: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  context: Record<string, unknown>;
}

/**
 * Middleware function can return:
 * - Response: short-circuit and return the response (redirect, 401, etc)
 * - Record: add data to context for downstream middleware/loaders/pages
 * - void/undefined: continue without adding to context
 */
export type MiddlewareResult =
  | Response
  | Record<string, unknown>
  | void
  | undefined;

/**
 * Middleware module with middleware function
 */
export interface MiddlewareModule {
  middleware: (
    context: MiddlewareContext
  ) => MiddlewareResult | Promise<MiddlewareResult>;
}

/**
 * Route handler object for Bun.serve routes
 */
export interface RouteHandlers {
  GET?: (req: Request) => Response | Promise<Response>;
  POST?: (req: Request) => Response | Promise<Response>;
  PUT?: (req: Request) => Response | Promise<Response>;
  DELETE?: (req: Request) => Response | Promise<Response>;
  PATCH?: (req: Request) => Response | Promise<Response>;
  OPTIONS?: (req: Request) => Response | Promise<Response>;
}

/**
 * Route modules map for client hydration
 */
export type RouteModules = Record<string, React.ComponentType<PageProps>>;

/**
 * Layout modules map for client hydration
 */
export type LayoutModules = Record<
  string,
  React.ComponentType<{ children: React.ReactNode }>
>;

/**
 * Server configuration returned by buildServerConfig
 */
export interface BunboxServerConfig {
  port: number;
  hostname: string;
  routes: Record<string, RouteHandlers>;
  readyMessage: string;
  fetch: (
    req: Request,
    server: Server<WebSocketData>
  ) => Response | Promise<Response | undefined>;
  websocket: {
    open: (ws: ServerWebSocket) => void;
    message: (ws: ServerWebSocket, message: string | Buffer) => void;
    close: (ws: ServerWebSocket, code?: number, reason?: string) => void;
  };
  development?:
    | {
        hmr: boolean;
        console: boolean;
      }
    | false;
}

/**
 * Phantom type for streaming responses
 * Used by client generator to infer AsyncIterable return type
 */
export interface StreamingResponse<T> extends Response {
  readonly __brand: "streaming";
  readonly __type: T;
}

/**
 * Phantom type for SSE responses
 * Used by client generator to infer AsyncIterable return type
 */
export interface SSEResponse<T> extends Response {
  readonly __brand: "sse";
  readonly __type: T;
}

