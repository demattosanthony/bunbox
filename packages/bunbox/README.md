# 📦 Bunbox

A minimal full-stack framework for Bun. Create files in `app/` and they become routes - pages, APIs, socket servers, and workers.

## What You Get

- **File-based routing**: `app/about/page.tsx` → `/about`
- **Server-side rendering**: React components render on the server
- **API routes**: Export HTTP methods from `route.ts` files
- **Socket servers**: Type-safe real-time communication with protocols
- **Workers**: Background tasks and long-running processes
- **TypeScript**: Full type safety, zero config
- **Fast**: Powered by Bun's native HTTP server

## 🚀 Quick Start

```bash
bun add @ademattos/bunbox
```

Create your first page:

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello World</h1>;
}
```

Start the dev server:

```bash
bunbox dev
```

Visit `http://localhost:3000`

## Project Structure

```
my-app/
├── package.json
├── bunbox.config.ts     # Optional
└── app/
    ├── page.tsx         # Home page (/)
    ├── layout.tsx       # Root layout
    ├── about/
    │   └── page.tsx     # /about
    ├── api/
    │   └── hello/
    │       └── route.ts # API endpoint
    ├── sockets/         # Socket servers
    │   └── chat/
    │       ├── protocol.ts
    │       └── route.ts
    └── worker.ts        # Worker (optional)
```

## Pages

Create `page.tsx` files for server-rendered React pages:

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello World</h1>;
}

// app/blog/[slug]/page.tsx
import type { PageProps } from "bunbox";

export default function BlogPost({ params, query }: PageProps) {
  return <h1>Post: {params.slug}</h1>;
}
```

## APIs

Bunbox provides a powerful typed API system with schema validation and automatic client generation.

### Basic API Routes

Export HTTP methods from `route.ts` files:

```tsx
// app/api/hello/route.ts
import { defineRoute, schema } from "bunbox";

// Define schemas for type safety
const responseSchema = schema.object({
  message: schema.string(),
});

export const GET = defineRoute({
  response: responseSchema,
  handler: async () => {
    return { message: "Hello" };
  },
});
```

### Typed Routes with Validation

```tsx
// app/api/users/[id]/route.ts
import type { BunboxRequest } from "bunbox";

export async function GET(req: BunboxRequest) {
  // Access route parameters
  const { id } = req.params;

  // Access query parameters
  const { filter } = req.query;

  return new Response(JSON.stringify({ id, filter }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: BunboxRequest) {
  const { id } = req.params;

  // Body is automatically parsed based on Content-Type
  const { name, email } = req.body;

  return new Response(JSON.stringify({ id, name, email }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

Available methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`

**Request body parsing:**

- JSON: `application/json` → parsed object
- Form data: `application/x-www-form-urlencoded` → parsed object
- Multipart: `multipart/form-data` → parsed object
- Text: `text/*` → raw string
- Other: attempts JSON parse, falls back to text

## Socket Servers

Socket servers provide type-safe, structured real-time communication.

### 1. Define a Protocol

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "bunbox";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
});
```

### 2. Create the Socket Server

```typescript
// app/sockets/chat/route.ts
import type { SocketUser, SocketContext, SocketMessage } from "bunbox";

export function onJoin(user: SocketUser, ctx: SocketContext) {
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
  ctx.broadcast("user-left", { username: user.data.username });
}
```

### 3. Connect from React

```tsx
import { useSocket } from "bunbox/client";
import { ChatProtocol } from "./app/sockets/chat/protocol";

function Chat() {
  const { subscribe, publish } = useSocket("/sockets/chat", ChatProtocol, {
    username: "Alice",
  });

  useEffect(() => {
    return subscribe("chat-message", (msg) => {
      console.log(`${msg.data.username}: ${msg.data.text}`);
    });
  }, [subscribe]);

  return (
    <button
      onClick={() =>
        publish("chat-message", { text: "Hi!", username: "Alice" })
      }
    >
      Send
    </button>
  );
}
```

### Socket Client (Vanilla JS)

```typescript
import { SocketClient } from "bunbox/client";
import { ChatProtocol } from "./app/sockets/chat/protocol";

const client = new SocketClient("/sockets/chat", ChatProtocol, {
  username: "Alice",
});

client.subscribe("chat-message", (msg) => {
  console.log(`${msg.data.username}: ${msg.data.text}`);
});

client.publish("chat-message", { text: "Hello!", username: "Alice" });
```

## Workers

Workers run background tasks. Create `app/worker.ts`:

```typescript
// app/worker.ts
import { SocketClient } from "bunbox/client";
import { ChatProtocol } from "./sockets/chat/protocol";

export default async function worker() {
  const client = new SocketClient("/sockets/chat", ChatProtocol, {
    username: "WorkerBot",
  });

  client.subscribe("chat-message", (msg) => {
    if (msg.data.text.includes("@bot")) {
      client.publish("chat-message", {
        text: "I'm here!",
        username: "WorkerBot",
      });
    }
  });

  // Optional cleanup function for graceful shutdown
  return {
    close: () => client.close(),
  };
}
```

**Worker modes:**

- **Mixed**: Worker + HTTP server (when you have both `app/worker.ts` and routes)
- **Worker-only**: Only worker runs, no HTTP server (when you only have `app/worker.ts`)

## Configuration

Create `bunbox.config.ts`:

```typescript
import type { BunboxConfig } from "@ademattos/bunbox";

const config: BunboxConfig = {
  port: 3000,
  hostname: "localhost",
  appDir: "./app",
};

export default config;
```

## CLI

```bash
bunbox dev              # Development with hot reload
bunbox start            # Production

# Options
bunbox dev --port 8080
bunbox start --hostname 0.0.0.0
```

## Examples

See `examples/basic/` for a complete example app.

```bash
cd examples/basic
bun dev
```

## License

MIT
