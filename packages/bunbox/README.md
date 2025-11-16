# 📦 Bunbox

A minimal full-stack framework for Bun. Create files in `app/` and they become routes - pages, APIs, socket servers, and workers.

## What You Get

- **File-based routing**: `app/about/page.tsx` → `/about`
- **Server-side rendering**: React components render on the server
- **API routes**: Ultra-minimal with full type safety
- **Typed API client**: Auto-generated, fully typed (params, query, body, response)
- **Socket servers**: Type-safe real-time communication
- **Workers**: Background tasks and long-running processes
- **TypeScript**: Full type safety, zero config
- **Fast**: Powered by Bun's native HTTP server
- **Tiny**: Only 2,449 lines of core code

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
import type { PageProps } from "@ademattos/bunbox";

export default function BlogPost({ params, query }: PageProps) {
  return <h1>Post: {params.slug}</h1>;
}
```

## API Routes

Bunbox provides an ultra-minimal API with full type safety and auto-generated typed client.

### Simple API Route

```typescript
// app/api/hello/route.ts
import { api } from "@ademattos/bunbox";

export const GET = api((req) => ({
  message: "Hello World",
  timestamp: new Date().toISOString(),
}));
```

That's it! 3 lines for a fully typed endpoint.

### With Type Parameters (Optional)

For even better type safety, specify types for params, query, body, and response:

```typescript
// app/api/users/route.ts
import { api } from "@ademattos/bunbox";

// Full type safety: api<Params, Query, Body, Response>
export const POST = api<
  any,
  any,
  { name: string; email: string }, // Body type
  { id: string; name: string; email: string } // Response type
>((req) => ({
  id: Math.random().toString(36).substring(7),
  name: req.body.name,
  email: req.body.email,
}));

export const GET = api<
  { id: string }, // Params type
  any,
  any,
  { id: string; name: string }
>((req) => ({
  id: req.params.id,
  name: "John Doe",
}));
```

### Auto-Generated Typed Client

Bunbox automatically generates a fully typed API client:

```typescript
import { api } from "./.bunbox/api-client";

// TypeScript knows all types!
const user = await api.users.POST({
  body: {
    name: "Alice",
    email: "alice@example.com",
  },
});

console.log(user.id); // ✅ TypeScript knows: string
console.log(user.name); // ✅ TypeScript knows: string
console.log(user.email); // ✅ TypeScript knows: string

// ❌ TypeScript errors on wrong types
await api.users.POST({
  body: { name: 123 }, // Error: number not assignable to string
});

// Query params, path params - all typed
const result = await api.users.GET({
  params: { id: "123" },
  query: { filter: "active" },
});
```

### With Route Parameters

```typescript
// app/api/users/[id]/route.ts
import { api, type BunboxRequest } from "@ademattos/bunbox";

export const GET = api((req: BunboxRequest) => {
  const { id } = req.params;
  return { id, name: "User " + id };
});

export const DELETE = api((req: BunboxRequest) => {
  const { id } = req.params;
  return { deleted: true, id };
});
```

### Response Helpers

```typescript
import { api, json, error } from "@ademattos/bunbox";

// json() helper
export const GET = api((req) => {
  return { data: "hello" }; // Automatically wrapped with json()
});

// Manual Response for custom headers/status
export async function POST(req: BunboxRequest) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
```

### Validation

Bunbox doesn't include validation - use Zod, Yup, or any library you prefer:

```typescript
import { api } from "@ademattos/bunbox";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

export const POST = api(async (req) => {
  // Validate with Zod
  const data = userSchema.parse(req.body);

  return {
    id: "123",
    ...data,
  };
});
```

## Socket Servers

Socket servers provide type-safe, structured real-time communication.

### 1. Define a Protocol

```typescript
// app/sockets/chat/protocol.ts
import { defineProtocol } from "@ademattos/bunbox";

export const ChatProtocol = defineProtocol({
  "chat-message": { text: "", username: "" },
  "user-joined": { username: "" },
  "user-left": { username: "" },
});
```

### 2. Create the Socket Server

```typescript
// app/sockets/chat/route.ts
import type {
  SocketUser,
  SocketContext,
  SocketMessage,
} from "@ademattos/bunbox";

export function onJoin(user: SocketUser, ctx: SocketContext) {
  // user.data is fully generic - pass any data you need
  ctx.broadcast("user-joined", {
    username: user.data.username || user.id,
  });
}

export function onMessage(
  user: SocketUser,
  message: SocketMessage,
  ctx: SocketContext
) {
  if (message.type === "chat-message") {
    ctx.broadcast("chat-message", {
      text: message.data.text,
      username: user.data.username || user.id,
    });
  }
}

export function onLeave(user: SocketUser, ctx: SocketContext) {
  ctx.broadcast("user-left", {
    username: user.data.username || user.id,
  });
}

// Optional: Authorize connections
export function onAuthorize(
  req: Request,
  userData: Record<string, any>
): boolean {
  // Validate user data before allowing connection
  return true;
}
```

### 3. Connect from React

```tsx
import { useSocket } from "@ademattos/bunbox/client";
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
import { SocketClient } from "@ademattos/bunbox/client";
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
import { SocketClient } from "@ademattos/bunbox/client";
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

## Why Bunbox?

- **Minimal**: Only 2,449 lines of core code
- **Typed**: Fully typed API client with params, query, body, response
- **Fast**: Built on Bun's native HTTP server
- **Simple**: `export const GET = api((req) => ({ ... }))` - that's it
- **Flexible**: Bring your own validation library (Zod, Yup, etc.)
- **Zero config**: Works out of the box

## Philosophy

> "The best code is deleted code"

Bunbox gives you:

- File-based routing (like Next.js)
- Typed API client (like tRPC, but simpler)
- Real-time sockets (like Socket.io, but type-safe)
- All in a tiny, hackable codebase

No magic. No vendor lock-in. Just TypeScript and Bun.

## License

MIT
