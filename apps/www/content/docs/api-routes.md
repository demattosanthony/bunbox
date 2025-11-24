---
title: API Routes
description: Create type-safe API endpoints with Bunbox
order: 8
category: API Routes
---

## Creating an API Route

Create a `route.ts` file in the `app/api/` directory:

```typescript
// app/api/hello/route.ts
import { route } from "@ademattos/bunbox";

export const GET = route.handle(async (ctx) => {
  return { message: "Hello, World!" };
});
```

This creates a GET endpoint at `/api/hello`.

## HTTP Methods

Support different HTTP methods by exporting handlers:

```typescript
// app/api/users/route.ts
import { route } from "@ademattos/bunbox";

export const GET = route.handle(async (ctx) => {
  return { users: [] };
});

export const POST = route.handle(async (ctx) => {
  const user = ctx.body;
  return { user, created: true };
});

export const DELETE = route.handle(async (ctx) => {
  return { deleted: true };
});
```

## Request Context

The handler receives a context object with useful properties:

```typescript
export const GET = route.handle(async (ctx) => {
  // Access request properties
  const { params, query, body, headers, url, method } = ctx;

  // Return JSON response
  return ctx.json({ message: "Hello" });
});
```

## Dynamic Routes

Use parameters in your API routes:

```typescript
// app/api/users/[id]/route.ts
import { route } from "@ademattos/bunbox";

export const GET = route.handle(async (ctx) => {
  const userId = ctx.params.id;
  return { userId, name: "John Doe" };
});
```

## Validation

Add validation with Zod or any validator:

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const POST = route.body(userSchema).handle(async (ctx) => {
  // ctx.body is now typed and validated
  return { user: ctx.body };
});
```

## Middleware

Add middleware to routes:

```typescript
import { route } from "@ademattos/bunbox";

const authMiddleware = async (ctx) => {
  const token = ctx.headers.get("authorization");
  if (!token) {
    throw new Error("Unauthorized");
  }
  return { user: { id: "123" } };
};

export const GET = route.use(authMiddleware).handle(async (ctx) => {
  // ctx.user is available from middleware
  return { user: ctx.user };
});
```

## Error Handling

Errors are automatically handled:

```typescript
export const GET = route.handle(async (ctx) => {
  if (!ctx.query.id) {
    throw new Error("ID is required");
  }
  return { id: ctx.query.id };
});
```

## Response Headers

Set custom response headers:

```typescript
export const GET = route.handle(async (ctx) => {
  return new Response(JSON.stringify({ data: "hello" }), {
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "value",
    },
  });
});
```

For streaming responses and Server-Sent Events, see the [Streaming](/docs/streaming) guide.
