/**
 * useSocket - React hook for socket connections
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { SocketClient } from "./socket";
import type { SocketMessage } from "./socket";
import type { Protocol } from "./protocol";

/**
 * Hook return type
 */
interface UseSocketReturn<P extends Protocol> {
  /** Subscribe to messages */
  subscribe: <K extends keyof P>(
    type: K,
    callback: (message: SocketMessage<P[K]>) => void
  ) => () => void;
  /** Publish messages */
  publish: <K extends keyof P>(type: K, data: P[K]) => void;
  /** Current username */
  username: string;
  /** Connection state */
  connected: boolean;
}

/**
 * React hook for connecting to socket servers
 *
 * @example
 * const { subscribe, publish, connected } = useSocket(
 *   "/sockets/chat",
 *   ChatProtocol,
 *   { username: "Alice" }
 * );
 */
type SocketUserData = { username: string } & Record<
  string,
  string | number | boolean
>;

export function useSocket<P extends Protocol>(
  url: string,
  protocol: P,
  userData: SocketUserData
): UseSocketReturn<P> {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<SocketClient<P> | null>(null);

  // Initialize client
  useEffect(() => {
    const client = new SocketClient(url, protocol, userData);
    clientRef.current = client;

    // Poll connection state
    const interval = setInterval(() => {
      setConnected(client.isConnected);
    }, 100);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      client.close();
      clientRef.current = null;
    };
  }, [url, userData.username]);

  // Memoized subscribe function
  const subscribe = useCallback(
    <K extends keyof P>(
      type: K,
      callback: (message: SocketMessage<P[K]>) => void
    ) => {
      if (!clientRef.current) {
        return () => {};
      }
      return clientRef.current.subscribe(type, callback);
    },
    []
  );

  // Memoized publish function
  const publish = useCallback(<K extends keyof P>(type: K, data: P[K]) => {
    if (!clientRef.current) {
      return;
    }
    clientRef.current.publish(type, data);
  }, []);

  return {
    subscribe,
    publish,
    username: userData.username,
    connected,
  };
}
