---
title: Socket Protocol
description: Define type-safe protocols for Socket communication
order: 13
category: Real-time
---

## Creating a Protocol

Define message types using `defineProtocol`:

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "@ademattos/bunbox/client";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
  "typing": { isTyping: false, username: "" },
});

export type ChatProtocolType = typeof ChatProtocol;
```

## Using the Protocol

Import and use the protocol in your socket route:

```typescript
// app/sockets/chat/route.ts
import type { SocketUser, SocketContext, SocketMessage } from "@ademattos/bunbox";

export function onJoin(user: SocketUser, ctx: SocketContext) {
  console.log("Client connected");
  ctx.broadcast("user-joined", { 
    username: user.data.username 
  });
}

export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  switch (message.type) {
    case "chat-message":
      ctx.broadcast("chat-message", {
        username: user.data.username,
        text: message.data.text,
      });
      break;

    case "typing":
      ctx.broadcast("typing", {
        username: user.data.username,
        isTyping: message.data.isTyping,
      });
      break;
  }
}

export function onLeave(user: SocketUser, ctx: SocketContext) {
  ctx.broadcast("user-left", { 
    username: user.data.username 
  });
}
```

## Client-Side Usage

Use the protocol with `useSocket`:

```tsx
import { useSocket } from "@ademattos/bunbox/client";
import { ChatProtocol } from "@/app/sockets/chat/protocol";

export default function Chat() {
  const { subscribe, publish } = useSocket(
    "/sockets/chat",
    ChatProtocol,
    { username: "John" }
  );

  // Subscribe to typed messages
  subscribe("chat-message", (msg) => {
    // msg.data is typed as { text: string, username: string }
    console.log(`${msg.data.username}: ${msg.data.text}`);
  });

  subscribe("user-joined", (msg) => {
    // msg.data is typed as { username: string }
    console.log(`${msg.data.username} joined`);
  });

  // Publish typed messages
  const sendMessage = (text: string) => {
    publish("chat-message", { text, username: "John" });
  };

  return <button onClick={() => sendMessage("Hello!")}>Send</button>;
}
```

## Type Safety Benefits

### Compile-Time Checking

```typescript
// ✅ Valid - matches protocol
publish("chat-message", { text: "Hi", username: "John" });

// ❌ Error - missing required field
publish("chat-message", { text: "Hi" });

// ❌ Error - invalid message type
publish("invalid-type", { foo: "bar" });

// ❌ Error - wrong data shape
publish("chat-message", { message: "Hi" });
```

### Autocomplete

Your IDE provides autocomplete for:
- Message types
- Message data fields
- Field types

### Refactoring

Rename or change message types safely - TypeScript catches all references.

## Message Structure

All socket messages follow this structure:

```typescript
interface SocketMessage<T = unknown> {
  type: string;        // From your protocol
  data: T;            // Typed based on protocol
  timestamp: number;   // Auto-added by server
  userId: string;      // Sender's user ID
}
```

## Protocol Patterns

### Simple Messages

```typescript
export const SimpleProtocol = defineProtocol({
  "ping": {},
  "hello": { name: "" },
});
```

### Complex Data

```typescript
export const GameProtocol = defineProtocol({
  "player-move": {
    playerId: "",
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  },
  "player-attack": {
    playerId: "",
    targetId: "",
    damage: 0,
  },
  "game-state": {
    players: [] as Array<{ id: string; hp: number }>,
    time: 0,
  },
});
```

### Union Types

```typescript
export const NotificationProtocol = defineProtocol({
  "notification": {
    type: "" as "info" | "warning" | "error",
    title: "",
    message: "",
  },
});
```

## Advanced Example

```typescript
// protocol.ts
import { defineProtocol } from "@ademattos/bunbox/client";

export const CollaborationProtocol = defineProtocol({
  // Document editing
  "doc-update": {
    documentId: "",
    userId: "",
    changes: [] as Array<{
      position: number;
      deleted: number;
      inserted: string;
    }>,
  },

  // Cursor positions
  "cursor-move": {
    userId: "",
    position: 0,
    selection: { start: 0, end: 0 },
  },

  // User presence
  "user-online": {
    userId: "",
    username: "",
    color: "",
  },

  "user-offline": {
    userId: "",
  },

  // Comments
  "comment-add": {
    id: "",
    userId: "",
    text: "",
    position: 0,
  },
});

export type CollaborationProtocolType = typeof CollaborationProtocol;
```

## Sharing Types

Export and reuse protocol types:

```typescript
// protocol.ts
export const MyProtocol = defineProtocol({
  "message": { text: "", username: "" },
});

export type MyProtocolType = typeof MyProtocol;

// Can be used in both client and server code
export type MessageData = MyProtocolType["message"];
```

## Protocol Validation

Protocols provide runtime validation:

```typescript
// Invalid messages are caught
try {
  publish("chat-message", { invalid: "data" });
} catch (error) {
  console.error("Invalid message:", error);
}
```

## Multiple Protocols

Use different protocols for different sockets:

```typescript
// app/sockets/chat/protocol.ts
export const ChatProtocol = defineProtocol({
  "message": { text: "" },
});

// app/sockets/game/protocol.ts
export const GameProtocol = defineProtocol({
  "move": { x: 0, y: 0 },
});
```

## Best Practices

### Keep Messages Small

```typescript
// ✅ Good - small focused messages
export const Protocol = defineProtocol({
  "player-move": { x: 0, y: 0 },
  "player-attack": { targetId: "" },
});

// ❌ Avoid - large nested objects
export const Protocol = defineProtocol({
  "update": {
    player: { /* many fields */ },
    world: { /* many fields */ },
    // ...
  },
});
```

### Use Descriptive Names

```typescript
// ✅ Good
"player-joined", "chat-message", "document-updated"

// ❌ Avoid
"msg", "update", "event"
```

### Version Your Protocols

```typescript
export const ProtocolV1 = defineProtocol({
  "message": { text: "" },
});

export const ProtocolV2 = defineProtocol({
  "message": { text: "", timestamp: 0 },
});
```

## Testing Protocols

Test your socket handlers with typed messages:

```typescript
import { describe, test, expect } from "bun:test";
import { onMessage } from "./route";

describe("Chat socket", () => {
  test("broadcasts messages", () => {
    const user = { id: "123", data: { username: "John" } };
    const message = {
      type: "chat-message",
      data: { text: "Hello" },
      timestamp: Date.now(),
      userId: "123",
    };

    // Test your handler
    onMessage(user, message, mockContext);
  });
});
```

