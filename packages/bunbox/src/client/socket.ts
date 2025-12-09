/**
 * SocketClient - Client library for connecting to Bunbox socket servers
 */

import type { Protocol } from "./protocol";

/**
 * Socket message received from server
 */
export interface SocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  userId: string;
}

/**
 * Event listener type
 */
type EventListener<T = unknown> = (message: SocketMessage<T>) => void;

/**
 * Reconnection options
 */
export interface ReconnectOptions {
  /** Enable automatic reconnection (default: true) */
  enabled?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
}

/**
 * Error event data
 */
export interface SocketErrorEvent {
  type: "connection_failed" | "max_reconnect_attempts";
  message: string;
  attempts?: number;
}

/**
 * SocketClient for connecting to socket servers with type-safe protocols
 */
export class SocketClient<P extends Protocol = Protocol> {
  private ws: WebSocket | null = null;
  private url: string;
  private userData: Record<string, unknown>;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private errorListeners: Set<(error: SocketErrorEvent) => void> = new Set();
  private connected = false;
  private closeResolver: (() => void) | null = null;
  private reconnectAttempts = 0;
  private reconnectOptions: Required<ReconnectOptions>;
  private intentionalClose = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    url: string,
    protocol: P,
    userData?: Record<string, unknown>,
    reconnect?: ReconnectOptions
  ) {
    // Convert relative URL to absolute WebSocket URL
    if (url.startsWith("/")) {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      this.url = `${wsProtocol}//${window.location.host}${url}`;
    } else {
      this.url = url;
    }

    this.userData = userData || {};
    this.reconnectOptions = {
      enabled: reconnect?.enabled ?? true,
      maxAttempts: reconnect?.maxAttempts ?? 5,
      baseDelay: reconnect?.baseDelay ?? 1000,
      maxDelay: reconnect?.maxDelay ?? 30000,
    };
    this.connect();
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
      // Reset reconnection attempts on successful connection
      this.reconnectAttempts = 0;
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

      // Resolve pending close promise
      if (this.closeResolver) {
        this.closeResolver();
        this.closeResolver = null;
      }

      // Attempt reconnection if not intentionally closed
      if (!this.intentionalClose && this.reconnectOptions.enabled) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOptions.maxAttempts) {
      const error: SocketErrorEvent = {
        type: "max_reconnect_attempts",
        message: `Failed to reconnect after ${this.reconnectAttempts} attempts`,
        attempts: this.reconnectAttempts,
      };
      this.errorListeners.forEach((listener) => listener(error));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectOptions.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.reconnectOptions.maxDelay
    );

    console.log(
      `[bunbox] Socket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectOptions.maxAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: SocketErrorEvent) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
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
    // Mark as intentional close to prevent reconnection
    this.intentionalClose = true;

    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

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
