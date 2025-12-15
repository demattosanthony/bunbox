/**
 * Browser entry point for Bunbox.
 *
 * Exposes only client-safe utilities to avoid pulling Node.js built-ins when
 * bundling for the browser.
 */

export { useStream } from "./client/useStream";
export type { UseStreamOptions, UseStreamResult } from "./client/useStream";
export { useIsClient } from "./client/useIsClient";
export { useClientEffect } from "./client/useClientEffect";
export { defineProtocol } from "./client/protocol";
export type { Protocol } from "./client/protocol";
export { useRouter, useParams, navigate, redirect } from "./client/router";
export { SocketClient } from "./client/socket";
export type {
  ReconnectOptions,
  SocketErrorEvent,
  SocketMessage,
} from "./client/socket";
export { useSocket } from "./client/useSocket";
export { clearQueryCache, clearQueryCacheKey } from "./client/useQuery";
export type { UseQueryOptions, UseQueryResult } from "./client/useQuery";
