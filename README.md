# 📦 Bunbox

**A full-stack web framework built on Bun - 100x simpler than Next.js**

Bunbox is a modern, lightweight full-stack framework that leverages Bun's native capabilities to provide:
- 📁 **File-based routing** (Next.js style)
- ⚛️ **React SSR** and client-side rendering
- 🔌 **REST API routes**
- 🔗 **WebSocket support** for real-time apps
- ⚡️ **Zero configuration** needed
- 🚀 **Blazing fast** performance with Bun

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Production server
bun start
```

Visit `http://localhost:3000` to see your app!

> **Note:** Bunbox supports React 18 and 19. React 19 includes SSR optimizations specifically for Bun's ReadableStream implementation for even better performance.

## 📖 Documentation

### Project Structure

```
my-bunbox-app/
├── app/                    # Application routes
│   ├── layout.tsx         # Root layout (wraps all pages)
│   ├── page.tsx           # Home page (/)
│   ├── about/
│   │   └── page.tsx       # About page (/about)
│   ├── blog/
│   │   └── [slug]/
│   │       └── page.tsx   # Dynamic route (/blog/:slug)
│   └── api/               # API routes
│       ├── health/
│       │   └── route.ts   # GET /api/health
│       └── users/
│           └── [id]/
│               └── route.ts  # REST API (/api/users/:id)
├── ws/                    # WebSocket routes
│   └── chat/
│       └── route.ts       # ws://localhost:3000/ws/chat
├── src/                   # Framework core (don't modify)
└── index.ts              # Server entry point
```

### Pages & Routing

#### Basic Page

Create a `page.tsx` file in the `app` directory:

```tsx
// app/page.tsx
import React from 'react';

export default function Home() {
  return (
    <div>
      <h1>Welcome to Bunbox!</h1>
    </div>
  );
}
```

#### Dynamic Routes

Use `[param]` syntax for dynamic segments:

```tsx
// app/blog/[slug]/page.tsx
import React from 'react';
import type { SSRContext } from 'bunbox';

export default function BlogPost({ params, query }: SSRContext) {
  const { slug } = params;
  
  return (
    <div>
      <h1>Blog Post: {slug}</h1>
    </div>
  );
}
```

This creates a route at `/blog/:slug` where `slug` is available in `params`.

#### Layouts

Layouts wrap pages and can be nested:

```tsx
// app/layout.tsx
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <nav>My Navigation</nav>
        {children}
        <footer>My Footer</footer>
      </body>
    </html>
  );
}
```

### API Routes

#### Basic API Route

Create a `route.ts` file in `app/api`:

```tsx
// app/api/hello/route.ts
import type { ApiHandler } from 'bunbox';

export const GET: ApiHandler['GET'] = async (req, context) => {
  return new Response(JSON.stringify({ message: 'Hello!' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: ApiHandler['POST'] = async (req, context) => {
  const body = await req.json();
  return new Response(JSON.stringify({ received: body }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

#### Dynamic API Routes

```tsx
// app/api/users/[id]/route.ts
import type { ApiHandler } from 'bunbox';

export const GET: ApiHandler['GET'] = async (req, context) => {
  const { id } = context.params;
  
  const user = await db.getUser(id);
  
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

Supports: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`

### WebSocket Routes

Create real-time features with WebSocket routes:

```tsx
// ws/chat/route.ts
import type { WsHandler } from 'bunbox';

const clients = new Set();

export const open: WsHandler['open'] = (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected' }));
};

export const message: WsHandler['message'] = (ws, message) => {
  // Broadcast to all clients
  for (const client of clients) {
    client.send(message);
  }
};

export const close: WsHandler['close'] = (ws) => {
  clients.delete(ws);
};
```

Connect from the client:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/chat');

ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

ws.send(JSON.stringify({ message: 'Hello!' }));
```

### Server Configuration

Customize the server in `index.ts`:

```tsx
import { createServer } from './src/index';

await createServer({
  port: 3000,
  hostname: 'localhost',
  appDir: './app',      // Default: './app'
  wsDir: './ws',        // Default: './ws'
  development: true,    // Enable hot reload
});
```

## 🎯 Features in Detail

### Server-Side Rendering (SSR)

All pages are automatically server-side rendered. Data is available on the server and can be hydrated on the client:

```tsx
export default function Page({ params, query }: SSRContext) {
  // This runs on the server during SSR
  // params: route parameters
  // query: URL query parameters
  // url: full URL
  
  return <div>SSR Content</div>;
}
```

### File-Based Routing

Routes are automatically generated from your file structure:

| File | Route |
|------|-------|
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` |
| `app/api/users/route.ts` | `/api/users` |
| `app/api/users/[id]/route.ts` | `/api/users/:id` |
| `ws/chat/route.ts` | `ws://host/ws/chat` |

### Type Safety

Full TypeScript support with type inference:

```tsx
import type { SSRContext, ApiHandler, WsHandler } from 'bunbox';
```

## 📦 Using as a Package

You can also use Bunbox as a package in your own project:

```bash
bun add bunbox
```

```tsx
import { createServer } from 'bunbox';

await createServer({
  port: 3000,
  appDir: './my-app',
  wsDir: './my-ws',
});
```

## 🔥 Why Bunbox?

### vs Next.js

- **100x Simpler**: No complex configuration, no build steps
- **Bun Native**: Uses Bun.serve() directly for maximum performance
- **WebSockets Built-in**: First-class WebSocket support
- **Zero Dependencies**: Minimal framework overhead

### vs Express/Fastify

- **React SSR**: Built-in server-side rendering
- **File-Based Routing**: No manual route registration
- **Type Safe**: Full TypeScript support
- **WebSockets**: Built-in real-time support

## 🛠️ Advanced Usage

### Middleware (Coming Soon)

```tsx
// middleware.ts
export function middleware(req: Request) {
  // Add authentication, logging, etc.
}
```

### Static Files (Coming Soon)

```
public/
├── images/
└── styles/
```

### API Client Utilities (Coming Soon)

```tsx
import { fetcher } from 'bunbox/client';

const data = await fetcher('/api/users/123');
```

## 📝 Examples

Check out the example app in this repository:

- Home page with navigation
- Dynamic blog routes
- REST API endpoints
- WebSocket chat room

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this in your projects!

## 🙏 Credits

Built with:
- [Bun](https://bun.sh) - The fast all-in-one JavaScript runtime
- [React](https://react.dev) - The library for web and native user interfaces

---

**Made with ❤️ and ⚡️ by the Bunbox team**

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
