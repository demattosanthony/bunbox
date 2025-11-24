---
title: WebSockets
description: Low-level WebSocket routes for custom real-time protocols
order: 14
category: Real-time
---

## Creating a WebSocket Route

Create a WebSocket route in `app/ws/` (note: different from `app/sockets/`):

```typescript
// app/ws/custom/route.ts
import type { ServerWebSocket, WebSocketContext } from "@ademattos/bunbox";

export function onOpen(ws: ServerWebSocket, ctx: WebSocketContext) {
  console.log("WebSocket opened");
  
  // Send a welcome message
  ws.send(JSON.stringify({ type: "welcome", message: "Connected!" }));
  
  // Subscribe to route topic (auto-managed)
  // Already subscribed to ctx.topic automatically
}

export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  console.log("Received:", message);
  
  // Echo back
  ws.send(message);
  
  // Broadcast to all connections on this route
  ctx.broadcast(message);
}

export function onClose(ws: ServerWebSocket, ctx: WebSocketContext) {
  console.log("WebSocket closed");
}
```

This creates a WebSocket at `/ws/custom`.

## WebSocket API

The `ServerWebSocket` provides Bun's native WebSocket API:

```typescript
export function onMessage(ws: ServerWebSocket, message: string | Buffer, ctx: WebSocketContext) {
  // Send message to this client
  ws.send("Hello!");
  ws.send(new Uint8Array([1, 2, 3]));
  
  // Close connection
  ws.close(1000, "Goodbye");
  
  // Check connection state
  console.log(ws.readyState);
  console.log(ws.remoteAddress);
  
  // Subscribe to topics
  ws.subscribe("room-1");
  ws.unsubscribe("room-1");
  
  // Publish to topic
  ws.publish("room-1", "Message for room 1");
  
  // Check subscriptions
  console.log(ws.subscriptions); // ["ws-custom", "room-1"]
  console.log(ws.isSubscribed("room-1")); // true
}
```

## WebSocket Context

The `WebSocketContext` provides convenient broadcasting:

```typescript
export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  // Broadcast to all clients on this route (includes sender)
  ctx.broadcast(message);
  
  // Broadcast JSON
  ctx.broadcastJSON({ type: "update", data: "..." });
  
  // Get route topic
  console.log(ctx.topic); // "ws-custom"
}
```

## Client-Side Usage

Connect from the browser:

```typescript
// In browser
const ws = new WebSocket("ws://localhost:3000/ws/custom");

ws.onopen = () => {
  console.log("Connected");
  ws.send("Hello server!");
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
};

ws.onclose = () => {
  console.log("Disconnected");
};

ws.onerror = (error) => {
  console.error("Error:", error);
};
```

## Connection Upgrade

Control who can connect with the `upgrade` function:

```typescript
export function upgrade(req: Request): boolean | { data?: unknown } {
  // Check authentication
  const token = new URL(req.url).searchParams.get("token");
  
  if (!token || !isValidToken(token)) {
    return false; // Reject connection
  }
  
  // Accept and attach custom data
  return {
    data: {
      userId: getUserFromToken(token),
      connectedAt: Date.now(),
    },
  };
}

export function onOpen(ws: ServerWebSocket, ctx: WebSocketContext) {
  // Access custom data
  console.log(ws.data); // { userId: "...", connectedAt: ... }
}
```

## Pub/Sub Rooms

Use topics for room-based communication:

```typescript
export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  const data = JSON.parse(message.toString());
  
  if (data.type === "join-room") {
    ws.subscribe(`room-${data.roomId}`);
    ws.send(JSON.stringify({ type: "joined", roomId: data.roomId }));
  }
  
  if (data.type === "room-message") {
    // Send only to room members
    ws.publish(`room-${data.roomId}`, JSON.stringify({
      type: "message",
      text: data.text,
    }));
  }
  
  if (data.type === "leave-room") {
    ws.unsubscribe(`room-${data.roomId}`);
  }
}
```

## Binary Data

Send and receive binary data:

```typescript
export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  if (Buffer.isBuffer(message)) {
    console.log("Received binary:", message.length, "bytes");
    
    // Echo binary back
    ws.send(message);
    
    // Or send new binary
    const buffer = new Uint8Array([1, 2, 3, 4]);
    ws.send(buffer);
  }
}
```

## Compression

Enable compression for large messages:

```typescript
export function onMessage(ws: ServerWebSocket, message: string | Buffer, ctx: WebSocketContext) {
  // Send with compression
  ws.send("Large message...", true);
  ws.publish("topic", "Large broadcast...", true);
}
```

## Corking

Batch multiple sends for better performance:

```typescript
export function onMessage(ws: ServerWebSocket, message: string | Buffer, ctx: WebSocketContext) {
  ws.cork(() => {
    // All sends are batched into one frame
    ws.send("Message 1");
    ws.send("Message 2");
    ws.send("Message 3");
  });
}
```

## Complete Example

```typescript
// app/ws/game/route.ts
import type { ServerWebSocket, WebSocketContext } from "@ademattos/bunbox";

interface Player {
  id: string;
  x: number;
  y: number;
}

const players = new Map<string, Player>();

export function upgrade(req: Request) {
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  
  if (!playerId) {
    return false;
  }
  
  return {
    data: { playerId },
  };
}

export function onOpen(ws: ServerWebSocket, ctx: WebSocketContext) {
  const playerId = (ws.data as any).playerId;
  
  // Add player
  players.set(playerId, { id: playerId, x: 0, y: 0 });
  
  // Send current game state
  ws.send(JSON.stringify({
    type: "init",
    players: Array.from(players.values()),
  }));
  
  // Notify others
  ctx.broadcastJSON({
    type: "player-joined",
    player: players.get(playerId),
  });
}

export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  const data = JSON.parse(message.toString());
  const playerId = (ws.data as any).playerId;
  
  if (data.type === "move") {
    const player = players.get(playerId);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      
      // Broadcast position update
      ctx.broadcastJSON({
        type: "player-moved",
        playerId,
        x: data.x,
        y: data.y,
      });
    }
  }
}

export function onClose(ws: ServerWebSocket, ctx: WebSocketContext) {
  const playerId = (ws.data as any).playerId;
  
  // Remove player
  players.delete(playerId);
  
  // Notify others
  ctx.broadcastJSON({
    type: "player-left",
    playerId,
  });
}
```

## When to Use WebSockets

Use WebSocket routes (`app/ws/`) when you need:
- Custom binary protocols
- Low-level control over messages
- Integration with existing WebSocket clients
- Performance-critical applications

For most cases, use [Socket routes](/docs/sockets) instead, which provide:
- Type-safe protocols
- Structured messages
- Easier client integration
- Better DX with `useSocket` hook

## Debugging

Log connection details:

```typescript
export function onOpen(ws: ServerWebSocket, ctx: WebSocketContext) {
  console.log("Connection from:", ws.remoteAddress);
  console.log("Route topic:", ctx.topic);
  console.log("Custom data:", ws.data);
}

export function onMessage(ws: ServerWebSocket, message: string | Buffer, ctx: WebSocketContext) {
  console.log("Message size:", message.length);
  console.log("Active subscriptions:", ws.subscriptions);
}

export function onClose(ws: ServerWebSocket, ctx: WebSocketContext, code?: number, reason?: string) {
  console.log("Closed with code:", code);
  console.log("Reason:", reason);
}
```

## Error Handling

Handle errors gracefully:

```typescript
export function onMessage(
  ws: ServerWebSocket,
  message: string | Buffer,
  ctx: WebSocketContext
) {
  try {
    const data = JSON.parse(message.toString());
    // Process data...
  } catch (error) {
    console.error("Invalid message:", error);
    ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
  }
}
```

## Close Codes

Use standard WebSocket close codes:

```typescript
export function onMessage(ws: ServerWebSocket, message: string | Buffer, ctx: WebSocketContext) {
  // Normal closure
  ws.close(1000, "Done");
  
  // Going away
  ws.close(1001, "Server restart");
  
  // Protocol error
  ws.close(1002, "Invalid data");
  
  // Unsupported data
  ws.close(1003, "Text only");
  
  // Policy violation
  ws.close(1008, "Unauthorized");
}
```

