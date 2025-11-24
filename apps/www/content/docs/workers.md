---
title: Workers
description: Background tasks and long-running processes with workers
order: 16
category: Advanced
---

## Overview

Workers in Bunbox run background tasks or long-running processes. Create a `worker.ts` file in your `app/` directory.

## Creating a Worker

Create `app/worker.ts`:

```typescript
export default async function worker() {
  console.log("Worker started");

  // Your background task
  setInterval(() => {
    console.log("Worker running...");
  }, 5000);
}
```

## Socket Client Worker

Connect to sockets from a worker:

```typescript
import { SocketClient } from "@ademattos/bunbox/client";
import { ChatProtocol } from "./sockets/chat/protocol";

export default async function worker() {
  const socketClient = new SocketClient(
    "ws://localhost:3000/sockets/chat",
    ChatProtocol,
    { username: "worker-bot" }
  );

  socketClient.subscribe("chat-message", (message) => {
    console.log("Received:", message.data.text);
  });

  socketClient.publish("chat-message", {
    text: "Hello from worker!",
    username: "worker-bot",
  });
}
```

## Cleanup Function

Return a cleanup function for hot reload:

```typescript
export default async function worker() {
  const interval = setInterval(() => {
    console.log("Running...");
  }, 1000);

  // Return cleanup function
  return {
    close: () => {
      clearInterval(interval);
      console.log("Worker stopped");
    },
  };
}
```

## Worker Lifecycle

- Workers start when the server starts
- Workers restart on hot reload in development
- Cleanup functions are called before restart
- Workers run in the same process as the server

## Use Cases

### Background Tasks

```typescript
export default async function worker() {
  // Periodic cleanup
  setInterval(async () => {
    await cleanupOldData();
  }, 3600000); // Every hour
}
```

### Socket Clients

```typescript
export default async function worker() {
  const client = new SocketClient("/sockets/notifications", Protocol, {});

  client.subscribe("notification", (msg) => {
    // Process notifications
  });

  return {
    close: () => client.close(),
  };
}
```

### Scheduled Jobs

```typescript
export default async function worker() {
  // Run every day at midnight
  const scheduleDailyJob = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      runDailyJob();
      scheduleDailyJob(); // Schedule next day
    }, msUntilMidnight);
  };

  scheduleDailyJob();
}
```

## Error Handling

Handle errors gracefully:

```typescript
export default async function worker() {
  try {
    // Your worker logic
  } catch (error) {
    console.error("Worker error:", error);
  }
}
```

## Development vs Production

- In development, workers restart on file changes
- In production, workers run continuously
- Use cleanup functions to prevent resource leaks

## Complete Example

```typescript
import { SocketClient } from "@ademattos/bunbox/client";
import { ChatProtocol } from "./sockets/chat/protocol";

export default async function worker() {
  console.log("Chat worker started");

  const socketClient = new SocketClient(
    "ws://localhost:3000/sockets/chat",
    ChatProtocol,
    { username: "bot" }
  );

  socketClient.subscribe("chat-message", (message) => {
    if (message.data.text.includes("hello")) {
      socketClient.publish("chat-message", {
        text: "Hello! How can I help?",
        username: "bot",
      });
    }
  });

  return {
    close: () => {
      socketClient.close();
      console.log("Chat worker stopped");
    },
  };
}
```
