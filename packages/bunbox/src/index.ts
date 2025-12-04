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
export type {
  BunboxConfig,
  ResolvedBunboxConfig,
  CorsConfig,
} from "./core/config";

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
  StreamingResponse,
  SSEResponse,
  JobConfig,
} from "./core/types";

export { defineJob, jobs } from "./core/jobs";

export { defineProtocol } from "./client/protocol";
export type { Protocol } from "./client/protocol";

export { json, error, route, stream, sse, defineMiddleware } from "./core/route";

export { useStream } from "./client/useStream";
export type { UseStreamOptions, UseStreamResult } from "./client/useStream";

export { ClientIsland, registerIsland } from "./client/island";
export type { ClientIslandProps } from "./client/island";
