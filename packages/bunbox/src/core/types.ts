/**
 * Core type definitions for Bunbox
 * Centralized types used across the framework
 */

import type React from "react";

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
export interface BunboxRequest extends Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
}

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
  broadcastJSON(data: any, compress?: boolean): number;
}

/**
 * WebSocket route module with named function exports
 */
export interface WsRouteModule {
  upgrade?: (
    req: Request
  ) => boolean | { data?: any } | Promise<boolean | { data?: any }>;
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
  data: Record<string, any>;
}

/**
 * Structured socket message
 */
export interface SocketMessage<T = any> {
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
  broadcast<T = any>(type: string, data: T): void;
  /** Send message to specific user */
  sendTo<T = any>(userId: string, type: string, data: T): void;
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
    userData: Record<string, any>
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
    server: any
  ) => Response | Promise<Response | undefined>;
  websocket: {
    open: (ws: any) => void;
    message: (ws: any, message: string | Buffer) => void;
    close: (ws: any, code?: number, reason?: string) => void;
  };
  development?:
    | {
        hmr: boolean;
        console: boolean;
      }
    | false;
}
