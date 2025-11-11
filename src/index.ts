/**
 * Bunbox - A simple full-stack framework built on Bun
 * 
 * Features:
 * - File-based routing (Next.js style)
 * - React SSR and client-side rendering
 * - API routes
 * - WebSocket support
 * - Zero configuration
 */

export { createServer, BunboxServer, type BunboxConfig } from './core/server';
export { type Route, type RouteMatch } from './core/router';
export { type SSRContext } from './core/ssr';
export { type ApiHandler, type WsHandler } from './core/server';

