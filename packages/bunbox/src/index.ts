/**
 * Bunbox - A minimal full-stack framework built on Bun
 *
 * Features:
 * - File-based routing (Next.js style)
 * - React SSR and client-side rendering
 * - API routes
 * - WebSocket support
 * - Zero configuration
 */

export { buildServerConfig } from "./core/server";
export type {
  RouteHandler,
  WsRouteModule,
  ServerWebSocket,
  WebSocketContext,
  BunboxServerConfig,
} from "./core/server";

export { resolveConfig } from "./core/config";
export type { BunboxConfig, ResolvedBunboxConfig } from "./core/config";

export {
  buildForProduction,
  hasBuildArtifacts,
  getBuildMetadata,
} from "./core/build";
export type { BuildMetadata } from "./core/build";

export type {
  BunboxRequest,
  PageProps,
  PageMetadata,
  Route,
  RouteMatch,
  PageModule,
  LayoutModule,
  SocketUser,
  SocketMessage,
  SocketContext,
  SocketRouteModule,
  Schema,
  ValidationResult,
  RouteDefinition,
} from "./core/types";

export { defineProtocol } from "./client/protocol";
export type { Protocol } from "./client/protocol";

export { schema, type Infer } from "./core/schema";
export { defineRoute, json, error, type TypedRouteHandler } from "./core/route";
