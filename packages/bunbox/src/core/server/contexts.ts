/**
 * WebSocket context implementation
 */

import type { Server } from "bun";
import type { WebSocketData, WebSocketContext } from "../types";

/**
 * WebSocket context implementation
 * Provides convenient broadcasting methods for WebSocket routes
 */
export class WebSocketContextImpl implements WebSocketContext {
  constructor(
    public readonly topic: string,
    private readonly server: Server<WebSocketData>
  ) {}

  broadcast(
    data: string | ArrayBuffer | Uint8Array,
    compress?: boolean
  ): number {
    return this.server.publish(this.topic, data, compress);
  }

  broadcastJSON(data: unknown, compress?: boolean): number {
    return this.server.publish(this.topic, JSON.stringify(data), compress);
  }
}
