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
 * Page metadata for HTML head tags
 */
export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  viewport?: string;
  favicon?: string;
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
  type: "page" | "api" | "ws" | "socket";
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

/**
 * API route module with HTTP method handlers
 */
export interface ApiRouteModule {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  DELETE?: RouteHandler;
  PATCH?: RouteHandler;
}

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
    }
  | {
      type: "socket";
      route: string;
      topic: string;
      user: SocketUser;
      handler: SocketRouteModule;
      ctx: SocketContext;
    };

/**
 * Page component props with route params and query
 */
export interface PageProps {
  params: Record<string, string>;
  query: Record<string, string>;
}

/**
 * Page module with React component
 */
export interface PageModule {
  default: React.ComponentType<PageProps>;
  metadata?: PageMetadata;
}

/**
 * Layout module with React component
 */
export interface LayoutModule {
  default: React.ComponentType<{ children: React.ReactNode }>;
  metadata?: PageMetadata;
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
 * Socket user with server-assigned ID and custom data
 */
export interface SocketUser {
  /** Server-assigned unique user ID */
  id: string;
  /** Custom user data */
  data: RouteExtras;
}

/**
 * Structured socket message
 */
export interface SocketMessage<T = unknown> {
  /** Message type identifier */
  type: string;
  /** Message payload */
  data: T;
  /** Server timestamp */
  timestamp: number;
  /** Sender's user ID */
  userId: string;
}

/**
 * Socket context passed to socket route handlers
 * Provides methods for broadcasting and user management
 */
export interface SocketContext {
  /** Broadcast message to all connected users */
  broadcast<T = unknown>(type: string, data: T): void;
  /** Send message to specific user */
  sendTo<T = unknown>(userId: string, type: string, data: T): void;
  /** Get all connected users */
  getUsers(): SocketUser[];
}

/**
 * Socket route module with handler exports
 */
export interface SocketRouteModule {
  /** Called when a user joins the socket */
  onJoin?: (user: SocketUser, ctx: SocketContext) => void | Promise<void>;
  /** Called when a user leaves the socket */
  onLeave?: (user: SocketUser, ctx: SocketContext) => void | Promise<void>;
  /** Called when a user sends a message */
  onMessage?: (
    user: SocketUser,
    message: SocketMessage,
    ctx: SocketContext
  ) => void | Promise<void>;
  /** Optional authorization check before connection */
  onAuthorize?: (
    req: Request,
    userData: Record<string, string>
  ) => boolean | Promise<boolean>;
}

/**
 * Worker cleanup function returned by worker
 */
export interface WorkerCleanup {
  close?: () => void | Promise<void>;
}

/**
 * Worker module with default export function
 * Used for background tasks like socket clients
 *
 * The worker function can return a cleanup object with a `close` method
 * that will be called on shutdown or hot reload.
 */
export interface WorkerModule {
  default?: () => void | Promise<void> | WorkerCleanup | Promise<WorkerCleanup>;
}

/**
 * Server configuration returned by buildServerConfig
 * Extends Bun.serve() configuration with additional Bunbox-specific properties
 */
export interface BunboxServerConfig {
  port: number;
  hostname: string;
  routes: Record<string, RouteHandlers>;
  workerOnly: boolean;
  workerPath: string | null;
  startWorkerAfterListen: () => Promise<void>;
  workerCleanup: () => Promise<void>;
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

// ============================================================================
// Job System Types
// ============================================================================

/**
 * Job configuration for defining scheduled or triggered jobs
 * @template T - The type of data passed to the job's run function
 */
export interface JobConfig<T = unknown> {
  /**
   * Cron schedule expression (5-field format)
   * Format: "minute hour day-of-month month day-of-week"
   * Examples: "0 * * * *" (hourly), "0 3 * * *" (daily at 3am)
   */
  schedule?: string;

  /**
   * Simple interval for job execution
   * Format: number followed by unit (s, m, h, d)
   * Examples: "30s", "5m", "1h", "1d"
   * Cannot be used with `schedule`
   */
  interval?: string;

  /**
   * The job handler function
   * @param data - Data passed when triggering the job (optional for scheduled jobs)
   */
  run: (data: T) => void | Promise<void>;
}

/**
 * Job module with default export
 */
export interface JobModule<T = unknown> {
  default: JobConfig<T>;
}

/**
 * Internal job instance tracked by JobManager
 */
export interface JobInstance<T = unknown> {
  /** Job name derived from filename */
  name: string;
  /** Job configuration */
  config: JobConfig<T>;
  /** File path for hot reload */
  path: string;
  /** Active timer reference (for cleanup) */
  timer?: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
}
