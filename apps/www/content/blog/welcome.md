---
title: Welcome to Bunbox
description: Introducing Bunbox - a simple full-stack framework built on Bun
date: 2024-11-24
author: Anthony Demattos
published: true
---

# Welcome to Bunbox

We're excited to introduce **Bunbox**, a simple full-stack framework built on [Bun](https://bun.sh). Bunbox aims to make building React applications faster and simpler than ever before.

## Why We Built Bunbox

Modern web frameworks have become increasingly complex. Setting up a project, understanding the configuration, and navigating through layers of abstraction can be overwhelming. We built Bunbox to change that.

### Our Goals

1. **Simplicity First** - Zero configuration needed to get started
2. **Lightning Fast** - Built on Bun for maximum performance
3. **Type-Safe** - Full TypeScript support out of the box
4. **Batteries Included** - Everything you need is built-in

## What Makes Bunbox Different?

### File-Based Routing

Just create files in the `app/` directory, and they automatically become routes:

```
app/
├── page.tsx              -> /
├── about/page.tsx        -> /about
└── blog/[slug]/page.tsx  -> /blog/:slug
```

No configuration files, no manual route definitions. It just works.

### Built-In WebSocket Support

Real-time features shouldn't be difficult to add. Bunbox includes WebSocket support out of the box:

```typescript
// app/sockets/chat/route.ts
export default socket({
  message(ws, data) {
    ws.publish("room", data);
  }
});
```

### Type-Safe API Routes

Create API endpoints with full type safety and validation:

```typescript
// app/api/users/route.ts
export const GET = route.handle(async (ctx) => {
  return { users: [] };
});
```

## Getting Started

Install Bunbox with a single command:

```bash
bun create bunbox my-app
cd my-app
bun dev
```

That's it! Your app is running at `http://localhost:3000`.

## What's Next?

We're just getting started. Here's what we're working on:

- Enhanced developer tools
- More examples and templates
- Improved documentation
- Community plugins

Join us on [GitHub](https://github.com/demattosanthony/bunbox) and help shape the future of Bunbox!

## Try It Today

Ready to build something amazing? Check out our [documentation](/docs/introduction) and start building with Bunbox today.

