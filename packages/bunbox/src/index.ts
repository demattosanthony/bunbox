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
  OpenGraphMetadata,
  OpenGraphImage,
  TwitterMetadata,
  Route,
  RouteMatch,
  PageModule,
  LayoutModule,
  MiddlewareContext,
  MiddlewareResult,
  MiddlewareModule,
  StreamingResponse,
  SSEResponse,
  LoaderContext,
} from "./core/types";

export { json, error, route, stream, sse, defineMiddleware } from "./core/route";
export type { HttpMethod, BeforeHook, AfterHook, RouteMeta } from "./core/route";

export {
  ApiError,
  ValidationError,
  errors,
  problemResponse,
} from "./core/errors";
export type {
  ProblemDetails,
  ValidationProblemDetails,
  FieldError,
} from "./core/errors";

// Middleware utilities
export {
  redirect,
  parseCookies,
  getCookie,
  setCookie,
  deleteCookie,
  createSetCookie,
} from "./core/middleware";
export type { CookieOptions } from "./core/middleware";
