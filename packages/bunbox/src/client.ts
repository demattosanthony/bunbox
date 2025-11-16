/**
 * Bunbox Client - Client-side utilities
 * Safe for browser usage (no Node.js APIs)
 */

export { useRouter, useParams, navigate } from "./client/router";
export { SocketClient } from "./client/socket";
export { useSocket } from "./client/useSocket";
export { defineProtocol } from "./client/protocol";
export type { Protocol } from "./client/protocol";
