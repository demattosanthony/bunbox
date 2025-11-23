# 📦 Bunbox

[![npm version](https://img.shields.io/npm/v/@ademattos/bunbox.svg)](https://www.npmjs.com/package/@ademattos/bunbox)

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

Bunbox ships a fluent `route` builder for defining fully typed handlers with minimal syntax.

### Simple API Route

```typescript
// app/api/hello/route.ts
import { route } from "@ademattos/bunbox";

export const GET = route.handle(() => ({
  message: "Hello World",
  timestamp: new Date().toISOString(),
}));
```

### Typed Params, Query, and Body

Bring your own validator (Zod, Valibot, custom) and Bunbox will infer the types end-to-end.

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const Params = z.object({ id: z.string() });
const Query = z.object({ filter: z.string().optional() });
const Body = z.object({ name: z.string(), email: z.string().email() });

export const POST = route
  .params(Params)
  .query(Query)
  .body(Body)
  .handle(({ params, query, body }) => ({
    id: params.id,
    filter: query.filter ?? "all",
    created: body,
  }));
```

### Shared Middleware

Compose reusable procedures with `use()`:

```typescript
const withAuth = route.use((ctx) => {
  const token = ctx.headers.get("Authorization");
  if (!token) throw new Error("Unauthorized");
  return { user: { id: "user_123" } };
});

export const GET = withAuth.handle(({ user }) => ({
  message: `Welcome ${user.id}`,
}));
```

### Auto-Generated Typed Client

Bunbox still generates `.bunbox/api-client.ts`, exposing a fully typed `api` object that mirrors your file system routes:

```typescript
import { api } from "./.bunbox/api-client";

const user = await api.users.POST({
  params: { id: "123" },
  body: { name: "Alice", email: "alice@example.com" },
});
```

### Validation

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

export const POST = route.body(userSchema).handle(({ body }) => ({
  id: "123",
  ...body,
}));
```

### React Hooks with useQuery

Every API method automatically includes a `.useQuery()` hook for React components. This provides loading states, error handling, caching, and refetching out of the box.

```tsx
// In a React component
import { api } from "./.bunbox/api-client";

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = api.users.GET.useQuery({
    params: { id: userId },
    enabled: !!userId, // conditional fetching
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**Features:**

- **Loading states**: `loading` boolean tracks request status
- **Error handling**: `error` contains any fetch errors
- **Caching**: Responses are cached automatically
- **Refetch**: Manual refetch via `refetch()` function
- **Conditional fetching**: Use `enabled: false` to skip the request

**Query options:**

```tsx
const { data, loading, error, refetch } = api.posts.GET.useQuery({
  params: { id: "123" },      // URL params
  query: { filter: "recent" }, // Query string params
  body: { data: "..." },       // Request body (POST/PUT/PATCH)
  headers: { ... },            // Custom headers
  enabled: true,               // Whether to fetch (default: true)
});
```

**Cache management:**

```typescript
import { clearQueryCache, clearQueryCacheKey } from "@ademattos/bunbox/client";

// Clear entire cache
clearQueryCache();

// Clear specific query
clearQueryCacheKey("GET", "/api/users", { params: { id: "123" } });
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
  userData: Record<string, string>
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
- **Simple**: `export const GET = route.handle(() => ({ ... }))` - that's it
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
