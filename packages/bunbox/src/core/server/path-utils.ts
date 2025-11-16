/**
 * Path resolution utilities for WebSocket and Socket routes
 * Consolidated from server.ts to reduce duplication
 */

import { join } from "path";

/**
 * Convert WebSocket route filepath to filesystem path
 */
export function getWsPath(wsDir: string, filepath: string): string {
  return join(wsDir, filepath.replace(/^ws\//, ""));
}

/**
 * Convert Socket route filepath to filesystem path
 */
export function getSocketPath(socketsDir: string, filepath: string): string {
  return join(socketsDir, filepath.replace(/^sockets\//, ""));
}

/**
 * Create topic name from route filepath
 * Examples:
 *   "ws/chat/route.ts" -> "ws-chat"
 *   "sockets/chat/route.ts" -> "socket-chat"
 */
export function getTopicFromRoute(filepath: string): string {
  return filepath.replace(/\/route\.ts$/, "").replaceAll("/", "-");
}
