<div align="center">

# 📦 Bunbox

For something between [Next.js](https://github.com/vercel/next.js) and [tRPC](https://github.com/trpc/trpc).

[![npm version](https://img.shields.io/npm/v/@ademattos/bunbox.svg)](https://www.npmjs.com/package/@ademattos/bunbox)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/tinyboxe/bunbox/blob/main/LICENSE)

</div>

---

Bunbox is a full-stack web framework built on [Bun](https://bun.sh):

- **File-based routing** - pages, APIs, and sockets
- **Type-safe APIs** - auto-generated typed client
- **Real-time sockets** - WebSocket servers with protocol types
- **SSR with React** - server-side rendering built-in
- **Background workers** - web workers for heavy tasks
- **Zero config** - works out of the box

It's inspired by Next.js (file-based routing), tRPC (end-to-end type safety), and Socket.io (real-time), but stays intentionally tiny and hackable.

---

## How Bunbox compares

**Next.js**

- ✅ Similar: file-based routing (`app/about/page.tsx`), API routes, React SSR
- ✅ You can build full-stack apps with familiar patterns
- 🔁 Unlike Next.js, the entire framework is ~3,000 lines and fully understandable

**tRPC**

- ✅ End-to-end type safety from server to client
- ✅ Auto-generated typed client for all your APIs
- 🔁 Simpler: uses file-based routing instead of procedure builders

**Socket.io**

- ✅ WebSocket servers with event-based messaging
- ✅ Built-in room/broadcast support
- 🔁 Fully type-safe protocols and React hooks for the client

---

## Installation

```bash
bun add @ademattos/bunbox
```

Or try an example:

```bash
git clone https://github.com/demattosanthony/bunbox.git
cd bunbox/examples/basic
bun install
bun dev
```

---

## Quick examples

### Pages

Create a file, get a route. React Server Components render on the server.

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello World</h1>;
}
```

→ `http://localhost:3000/`

```tsx
// app/about/page.tsx
export default function About() {
  return <h1>About Us</h1>;
}
```

→ `http://localhost:3000/about`

### Type-safe APIs

Define an API route and get a fully typed client automatically.

```typescript
// app/api/user/[id]/route.ts
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const Params = z.object({ id: z.string() });
const Query = z.object({ include: z.string().optional() });

export const GET = route
  .params(Params)
  .query(Query)
  .handle(({ params, query }) => ({
    id: params.id,
    name: "John Doe",
    email: query.include === "email" ? "john@example.com" : undefined,
  }));
```

Use it from the client with full type safety:

```tsx
// app/profile/page.tsx
import { api } from "@ademattos/bunbox/client";

export default function Profile() {
  const { data } = api.user[":id"].GET.useQuery({
    params: { id: "123" },
    query: { include: "email" }, // fully typed!
  });

  return <div>{data?.email}</div>; // data is fully typed!
}
```

See how the types flow through? No code generation step. No build plugins. Just TypeScript.

### Real-time WebSockets

Create a socket server with event handlers:

```typescript
// app/sockets/chat/route.ts
import type {
  SocketUser,
  SocketContext,
  SocketMessage,
} from "@ademattos/bunbox";

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
```

Use it from the client with the `useSocket` hook:

```tsx
// app/chat/page.tsx
import { useSocket } from "@ademattos/bunbox/client";

export default function Chat() {
  const { subscribe, publish, connected } = useSocket("/sockets/chat", {
    username: "alice",
  });

  useEffect(() => {
    return subscribe("chat-message", (msg) => {
      console.log(msg.data.text); // fully typed!
    });
  }, []);

  const send = () => publish("chat-message", { text: "Hello!" });

  return <button onClick={send}>Send</button>;
}
```

See [examples/basic/app/chat](./examples/basic/app/chat) for a complete chat app.

---

## Why Bunbox?

**For Next.js users**

You want file-based routing and React SSR, but you don't need all of Next.js. You want something you can read and understand in an afternoon.

**For tRPC users**

You want end-to-end type safety, but you prefer file-based routing over procedure builders. You want API routes that feel like REST but work like RPC.

**For Socket.io users**

You want real-time WebSockets with clean abstractions, but you also want type safety and React hooks that just work.

**For everyone**

You want a framework that's small enough to understand completely (~3,000 lines), but powerful enough to build real apps. No magic, no complexity - just files become routes, types flow through automatically.

---

## Examples

- [examples/basic](./examples/basic) - Full-featured app with pages, APIs, and WebSockets
- [examples/with-tailwind](./examples/with-tailwind) - Styled with Tailwind CSS and shadcn/ui

## License

MIT
