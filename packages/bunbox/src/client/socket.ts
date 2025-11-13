/**
 * SocketClient - Client library for connecting to Bunbox socket servers
 */

import type { Protocol } from "./protocol";

/**
 * Socket message received from server
 */
interface SocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  userId: string;
}

/**
 * Event listener type
 */
type EventListener<T = any> = (message: SocketMessage<T>) => void;

/**
 * SocketClient for connecting to socket servers with type-safe protocols
 */
export class SocketClient<P extends Protocol = any> {
  private ws: WebSocket | null = null;
  private url: string;
  private userData: { username: string; [key: string]: any };
  private listeners: Map<string, Set<EventListener>> = new Map();
  private connected = false;
  private closeResolver: (() => void) | null = null;

  constructor(
    url: string,
    protocol: P,
    userData: { username: string; [key: string]: any }
  ) {
    // Convert relative URL to absolute WebSocket URL
    if (url.startsWith("/")) {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      this.url = `${wsProtocol}//${window.location.host}${url}`;
    } else {
      this.url = url;
    }

    this.userData = userData;
    this.connect();
  }

  /**
   * Get current username
   */
  get username(): string {
    return this.userData.username;
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to socket server
   */
  private connect(): void {
    // Add user data as query parameters
    const url = new URL(this.url);
    Object.entries(this.userData).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    this.ws = new WebSocket(url.toString());

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);

        // Dispatch to type-specific listeners
        const listeners = this.listeners.get(message.type);
        if (listeners) {
          listeners.forEach((listener) => listener(message));
        }
      } catch (error) {
        console.error("Failed to parse socket message:", error);
      }
    };

    this.ws.onerror = (event) => {
      console.error("WebSocket error:", event);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      // Resolve any pending close promise
      if (this.closeResolver) {
        this.closeResolver();
        this.closeResolver = null;
      }
    };
  }

  /**
   * Subscribe to messages of a specific type
   */
  subscribe<K extends keyof P>(
    type: K,
    callback: (message: SocketMessage<P[K]>) => void
  ): () => void {
    const typeStr = String(type);

    if (!this.listeners.has(typeStr)) {
      this.listeners.set(typeStr, new Set());
    }

    this.listeners.get(typeStr)!.add(callback as EventListener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(typeStr);
      if (listeners) {
        listeners.delete(callback as EventListener);
        if (listeners.size === 0) {
          this.listeners.delete(typeStr);
        }
      }
    };
  }

  /**
   * Publish a message to the socket server
   */
  publish<K extends keyof P>(type: K, data: P[K]): void {
    if (!this.connected || !this.ws) {
      console.warn("Cannot publish: not connected");
      return;
    }

    const message = {
      type: String(type),
      data,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the connection
   * Returns a promise that resolves when the connection is closed
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }

      // Store resolver to be called by onclose handler
      this.closeResolver = resolve;
      this.ws.close();
    });
  }
}
