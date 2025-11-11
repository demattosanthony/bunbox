# 📦 Bunbox

A minimal full-stack framework for Bun that lets you build React apps with zero configuration. Just create files in the `app/` directory and they become routes - pages, APIs, and WebSockets all work the same way.

## What You Get

- **File-based routing**: `app/about/page.tsx` → `/about` route
- **Server-side rendering**: React components render on the server, hydrate on the client
- **API routes**: Export HTTP methods (`GET`, `POST`, etc.) from `route.ts` files
- **WebSocket support**: Built-in real-time connections with simple handlers
- **TypeScript**: Full type safety with zero config
- **Fast**: Powered by Bun's native HTTP server

## 🚀 Quick Start

```bash
bun install
bun dev
```

Your app is now running at `http://localhost:3000`

## How It Works

Bunbox scans your `app/` directory and automatically creates routes based on your file structure:

```
app/
├── page.tsx                 # GET /
├── about/page.tsx           # GET /about
├── blog/[slug]/page.tsx     # GET /blog/:slug (dynamic)
└── api/
    └── users/[id]/route.ts  # /api/users/:id (all HTTP methods)
ws/
└── chat/route.ts            # WebSocket: ws://localhost:3000/ws/chat
```

## Building Pages

Create a `page.tsx` file with a default export - it becomes a server-rendered React page:

```tsx
// app/page.tsx
export default function Home() {
  return <h1>Hello World</h1>;
}
```

### Dynamic Routes with Params

Use `[param]` folders to capture URL segments. Access them via the `params` prop:

```tsx
// app/blog/[slug]/page.tsx
import type { SSRContext } from "bunbox";

export default function BlogPost({ params, query }: SSRContext) {
  // params.slug comes from the URL: /blog/hello-world
  // query contains ?search=... parameters
  return <h1>Post: {params.slug}</h1>;
}
```

### Shared Layouts

A `layout.tsx` wraps all pages in that directory and subdirectories:

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <nav>Nav</nav>
        {children}
        <footer>Footer</footer>
      </body>
    </html>
  );
}
```

## Building APIs

Export HTTP methods from a `route.ts` file to create REST endpoints:

```tsx
// app/api/hello/route.ts
import type { ApiHandler } from "bunbox";

export const GET: ApiHandler["GET"] = async (req, context) => {
  return new Response(JSON.stringify({ message: "Hello" }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: ApiHandler["POST"] = async (req, context) => {
  const body = await req.json();
  return new Response(JSON.stringify({ received: body }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

Available methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`

Access route params via `context.params` (e.g., `app/api/users/[id]/route.ts` gets `context.params.id`)

## Building WebSockets

Create real-time features by exporting handlers from `ws/*/route.ts`:

```tsx
// ws/chat/route.ts
import type { WsHandler } from "bunbox";

const clients = new Set();

export const open: WsHandler["open"] = (ws) => {
  clients.add(ws);
  console.log("Client connected");
};

export const message: WsHandler["message"] = (ws, msg) => {
  // Broadcast to all connected clients
  for (const client of clients) {
    client.send(msg);
  }
};

export const close: WsHandler["close"] = (ws) => {
  clients.delete(ws);
  console.log("Client disconnected");
};
```

Connect from the browser:

```javascript
const ws = new WebSocket("ws://localhost:3000/ws/chat");
ws.onmessage = (event) => console.log("Received:", event.data);
ws.send("Hello!");
```

## Configuration

Customize the server by modifying `index.ts`:

```tsx
// index.ts
import { createServer } from "./src/index";

await createServer({
  port: 3000, // Server port
  hostname: "localhost", // Bind address
  appDir: "./app", // Pages and API routes directory
  wsDir: "./ws", // WebSocket routes directory
  development: true, // Enable hot reload and detailed logging
});
```

## Using as a Package

Install Bunbox in your own project:

```bash
bun add @ademattos/bunbox
```

Then create your server:

```tsx
// index.ts
import { createServer } from "@ademattos/bunbox";

await createServer({
  port: 3000,
  appDir: "./app",
  wsDir: "./ws",
});
```

Create your app structure and you're ready to go.
