/**
 * WebSocket and Socket context implementations
 * Extracted from server.ts for better modularity
 */

import type { Server } from "bun";
import type {
  WebSocketData,
  WebSocketContext,
  SocketContext,
  SocketUser,
  SocketMessage,
} from "../types";

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

  broadcastJSON(data: any, compress?: boolean): number {
    return this.server.publish(this.topic, JSON.stringify(data), compress);
  }
}

/**
 * Socket context implementation
 * Provides methods for socket route handlers
 */
export class SocketContextImpl implements SocketContext {
  constructor(
    private readonly topic: string,
    private readonly server: Server<WebSocketData>,
    private readonly users: Map<string, SocketUser>
  ) {}

  broadcast<T = any>(type: string, data: T): void {
    const message: SocketMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
      userId: "",
    };
    this.server.publish(this.topic, JSON.stringify(message));
  }

  sendTo<T = any>(userId: string, type: string, data: T): void {
    // Send to a specific user by iterating through subscriptions
    // Note: This is a simple implementation. For large scale, consider a userId->ws map
    const message: SocketMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
      userId,
    };

    const user = this.users.get(userId);
    if (user) {
      // Publish to a user-specific topic (requires manual subscription)
      this.server.publish(`socket-user-${userId}`, JSON.stringify(message));
    }
  }

  getUsers(): SocketUser[] {
    return Array.from(this.users.values());
  }
}
