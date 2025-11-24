---
title: Sockets
description: Type-safe real-time communication with Socket routes
order: 12
category: Real-time
---

## Creating a Socket Route

Create a socket route in `app/sockets/` by exporting handler functions:

```typescript
// app/sockets/chat/route.ts
import type { SocketUser, SocketContext, SocketMessage } from "@ademattos/bunbox";

export function onJoin(user: SocketUser, ctx: SocketContext) {
  console.log(`User ${user.id} joined`);
  ctx.broadcast("user-joined", { username: user.data.username });
}

export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  if (message.type === "chat-message") {
    ctx.broadcast("chat-message", {
      text: message.data.text,
      username: user.data.username,
    });
  }
}

export function onLeave(user: SocketUser, ctx: SocketContext) {
  console.log(`User ${user.id} left`);
  ctx.broadcast("user-left", { username: user.data.username });
}
```

This creates a socket at `/sockets/chat`.

## Defining a Protocol

Create a typed protocol for your messages:

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "@ademattos/bunbox/client";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
  "typing": { isTyping: false, username: "" },
});
```

## Client-Side Usage

Use the `useSocket` hook to connect to your socket:

```tsx
"use client";

import { useSocket } from "@ademattos/bunbox/client";
import { ChatProtocol } from "@/app/sockets/chat/protocol";

export default function Chat() {
  const { subscribe, publish, connected, username } = useSocket(
    "/sockets/chat",
    ChatProtocol,
    { username: "John" }
  );

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribe("chat-message", (msg) => {
      console.log(`${msg.data.username}: ${msg.data.text}`);
    });

    return unsubscribe;
  }, [subscribe]);

  // Publish messages
  const sendMessage = (text: string) => {
    publish("chat-message", { text, username });
  };

  return (
    <div>
      {connected ? "Connected" : "Connecting..."}
      <button onClick={() => sendMessage("Hello!")}>Send</button>
    </div>
  );
}
```

## Authorization

Add authorization to socket connections:

```typescript
export function onAuthorize(
  req: Request,
  userData: Record<string, string>
): boolean {
  // Validate user data before connection
  if (!userData.username || userData.username.length > 20) {
    return false;
  }
  return true;
}
```

## Socket Context

The context provides methods for communication:

```typescript
export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  // Broadcast to all connected users
  ctx.broadcast("message", { text: "Hello everyone" });

  // Send to specific user
  ctx.sendTo(userId, "private", { text: "Hello!" });

  // Get all connected users
  const users = ctx.getUsers();
  console.log(`${users.length} users online`);
}
```

## Socket Message Structure

All socket messages have this structure:

```typescript
interface SocketMessage<T = unknown> {
  type: string;        // Message type from protocol
  data: T;            // Message payload
  timestamp: number;   // Server timestamp
  userId: string;      // Sender's user ID
}
```

## User Data

Access user data in handlers:

```typescript
export function onMessage(user: SocketUser, message: SocketMessage, ctx: SocketContext) {
  // User ID (auto-generated)
  console.log(user.id);

  // Custom user data from connection
  console.log(user.data.username);
  console.log(user.data.role);
}
```

## Complete Example

```typescript
// app/sockets/chat/route.ts
import type { SocketUser, SocketContext, SocketMessage } from "@ademattos/bunbox";

interface ChatData {
  text: string;
  username: string;
}

export function onAuthorize(
  req: Request,
  userData: Record<string, string>
): boolean {
  return Boolean(userData.username);
}

export function onJoin(user: SocketUser, ctx: SocketContext) {
  const username = user.data.username || user.id;
  console.log(`${username} joined chat`);
  
  ctx.broadcast("user-joined", { username });
  console.log(`Total users: ${ctx.getUsers().length}`);
}

export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  if (message.type === "chat-message") {
    const data = message.data as ChatData;
    ctx.broadcast("chat-message", {
      text: data.text,
      username: user.data.username || user.id,
    });
  }
}

export function onLeave(user: SocketUser, ctx: SocketContext) {
  const username = user.data.username || user.id;
  ctx.broadcast("user-left", { username });
  console.log(`${username} left chat`);
}
```

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "@ademattos/bunbox/client";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
});
```

```tsx
// app/chat/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@ademattos/bunbox/client";
import { ChatProtocol } from "@/app/sockets/chat/protocol";

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  
  const { subscribe, publish, connected } = useSocket(
    "/sockets/chat",
    ChatProtocol,
    { username: "User" }
  );

  useEffect(() => {
    const unsub1 = subscribe("chat-message", (msg) => {
      setMessages((prev) => [...prev, `${msg.data.username}: ${msg.data.text}`]);
    });

    const unsub2 = subscribe("user-joined", (msg) => {
      setMessages((prev) => [...prev, `${msg.data.username} joined`]);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [subscribe]);

  const sendMessage = () => {
    if (input.trim() && connected) {
      publish("chat-message", { text: input, username: "User" });
      setInput("");
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        disabled={!connected}
      />
      
      <button onClick={sendMessage} disabled={!connected}>
        Send
      </button>
    </div>
  );
}
```

## Type Safety

Sockets are fully type-safe:

```typescript
// Server knows message types
export function onMessage(user: SocketUser, message: SocketMessage, ctx: SocketContext) {
  if (message.type === "chat-message") {
    // TypeScript narrows the type
    const text: string = message.data.text;
  }
}

// Client has autocomplete
publish("chat-message", { text: "Hi", username: "John" }); // ✓
publish("invalid", { foo: "bar" }); // ✗ Error
```

## Use Cases

### Chat Applications

```typescript
export function onMessage(user: SocketUser, message: SocketMessage, ctx: SocketContext) {
  ctx.broadcast("chat-message", {
    text: message.data.text,
    username: user.data.username,
  });
}
```

### Real-time Notifications

```typescript
export function onMessage(user: SocketUser, message: SocketMessage, ctx: SocketContext) {
  if (message.type === "notify-all") {
    ctx.broadcast("notification", {
      title: message.data.title,
      body: message.data.body,
    });
  }
}
```

### Multiplayer Games

```typescript
export function onMessage(user: SocketUser, message: SocketMessage, ctx: SocketContext) {
  if (message.type === "player-move") {
    ctx.broadcast("game-update", {
      playerId: user.id,
      position: message.data.position,
    });
  }
}
```

