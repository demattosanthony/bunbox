# 📦 Bunbox

[![npm version](https://img.shields.io/npm/v/@ademattos/bunbox.svg)](https://www.npmjs.com/package/@ademattos/bunbox)

A minimal full-stack framework for Bun. Create files in `app/` and they become routes - pages, APIs, socket servers, and workers.

## What You Get

- **File-based routing** - `app/about/page.tsx` → `/about`
- **Typed API client** - Auto-generated, fully typed (params, query, body, response)
- **Socket servers** - Type-safe real-time communication
- **Server-side rendering** - React on the server
- **Workers** - Background tasks
- **Zero config** - Works out of the box
- **Tiny** - Only 2,741 lines of core code

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

Create an API:

```typescript
// app/api/hello/route.ts
import { api } from "@ademattos/bunbox";

export const GET = api((req) => ({
  message: "Hello World",
}));
```

Start the dev server:

```bash
bunbox dev
```

Visit `http://localhost:3000`

## Documentation

See [packages/bunbox/README.md](./packages/bunbox/README.md) for complete documentation.

## Examples

```bash
cd examples/basic
bun dev
```

## Why Bunbox?

**Minimal by design:**

- Only dependancies are Bun and React
- No complex abstractions

**Powerful when needed:**

- Fully typed API client
- Type-safe sockets
- SSR with React
- Background workers

Bunbox gives you Next.js-style routing, tRPC-style type safety, and Socket.io-style real-time - all in a tiny, hackable framework.

## License

MIT
