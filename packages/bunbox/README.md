<div align="center">

# 📦 Bunbox

A full-stack TypeScript framework built on [Bun](https://bun.sh). File-based routing, type-safe APIs, and real-time WebSockets.

<h3>

[Homepage](https://bunbox.anthonydemattos.com) | [Documentation](https://bunbox.anthonydemattos.com/docs/introduction)

</h3>

[![npm version](https://img.shields.io/npm/v/@ademattos/bunbox.svg)](https://www.npmjs.com/package/@ademattos/bunbox)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/tinyboxe/bunbox/blob/main/LICENSE)

</div>

---

- **File-based routing** for pages, APIs, and WebSockets
- **Type-safe APIs** with auto-generated typed client
- **Real-time WebSockets** with typed protocols and React hooks
- **Server-side rendering** with React
- **Background jobs** with cron scheduling
- **Zero config** - works out of the box

---

## Getting Started

```bash
bun create bunbox my-app
cd my-app
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

export const getUser = route
  .get()
  .params(Params)
  .query(Query)
  .handle(({ params, query }) => ({
    id: params.id,
    name: "John Doe",
    email: query.include === "email" ? "john@example.com" : undefined,
  }));
```

Use it from the client with full type safety and flattened options:

```tsx
// app/profile/page.tsx
import { api } from "@ademattos/bunbox/client";

export default function Profile() {
  const { data } = api.user.getUser.useQuery({
    id: "123",           // params are flattened
    include: "email",    // query params are flattened too!
  });

  return <div>{data?.email}</div>; // data is fully typed!
}
```

See how the types flow through? No code generation step. No build plugins. Just TypeScript. And with flattened options, the API is clean and intuitive.

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

- **Fast to start** - Zero config. Create a project and start building.
- **Fast to run** - Built on Bun with sub-millisecond startup.
- **Type-safe by default** - Types flow from server to client automatically.
- **Small and readable** - The entire framework is small enough to understand.

Bunbox combines patterns from Next.js (file-based routing), tRPC (end-to-end types), and Socket.io (real-time) into a single, minimal framework.

---

## Examples

- [examples/basic](./examples/basic) - Full-featured app with pages, APIs, and WebSockets
- [examples/with-tailwind](./examples/with-tailwind) - Styled with Tailwind CSS and shadcn/ui

## License

MIT
