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

export const hello = route.get().handle(async (ctx) => {
  return { message: "Hello, World!" };
});
```

This creates a GET endpoint at `/api/hello`.

## HTTP Methods

Use method builders for different HTTP methods:

```typescript
// app/api/users/route.ts
import { route } from "@ademattos/bunbox";

export const listUsers = route.get().handle(async (ctx) => {
  return { users: [] };
});

export const createUser = route.post().handle(async (ctx) => {
  const user = ctx.body;
  return { user, created: true };
});

export const deleteUser = route.delete().handle(async (ctx) => {
  return { deleted: true };
});
```

Available methods: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`

## Request Context

The handler receives a context object with useful properties:

```typescript
export const getUser = route.get().handle(async (ctx) => {
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

export const getUser = route.get().handle(async (ctx) => {
  const userId = ctx.params.id;
  return { userId, name: "John Doe" };
});
```

## Validation

Add validation with Zod schemas:

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const createUser = route
  .post()
  .body(UserSchema)
  .handle(async (ctx) => {
    // ctx.body is typed and validated
    return { user: ctx.body };
  });
```

## Middleware

Add middleware to routes:

```typescript
import { route, defineMiddleware } from "@ademattos/bunbox";

const auth = defineMiddleware(async (ctx) => {
  const token = ctx.headers.get("authorization");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  return { user: { id: "123" } };
});

export const getProfile = route
  .get()
  .use(auth)
  .handle(async (ctx) => {
    // ctx.user is available from middleware
    return { user: ctx.user };
  });
```

## Error Handling

Errors are automatically handled:

```typescript
import { route, error } from "@ademattos/bunbox";

export const getUser = route.get().handle(async (ctx) => {
  if (!ctx.query.id) {
    return error("ID is required", 400);
  }
  return { id: ctx.query.id };
});
```

## Response Headers

Set custom response headers:

```typescript
export const download = route.get().handle(async (ctx) => {
  return new Response(JSON.stringify({ data: "hello" }), {
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "value",
    },
  });
});
```

## OpenAPI Documentation

Add metadata for auto-generated API docs:

```typescript
export const createUser = route
  .post()
  .meta({
    summary: "Create a new user",
    description: "Creates a user account",
    tags: ["users"],
  })
  .body(UserSchema)
  .handle(async (ctx) => {
    return { user: ctx.body };
  });
```

See [OpenAPI & Swagger](/docs/openapi) for full documentation.

For streaming responses and Server-Sent Events, see the [Streaming](/docs/streaming) guide.
