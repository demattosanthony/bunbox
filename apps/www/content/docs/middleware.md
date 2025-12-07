---
title: Middleware
description: Add middleware to your API routes
order: 11
category: API Routes
---

## Creating Middleware

Create a middleware function:

```typescript
import { route } from "@ademattos/bunbox";

const logger = async (ctx) => {
  console.log(`${ctx.method} ${ctx.url}`);
  // Return nothing to continue
};

export const getMessage = route
  .get()
  .use(logger)
  .handle(async (ctx) => {
    return { message: "Hello" };
  });
```

## Adding Context

Middleware can add data to the context:

```typescript
const authMiddleware = async (ctx) => {
  const token = ctx.headers.get("authorization");

  if (!token) {
    throw new Error("Unauthorized");
  }

  // Return data to add to context
  return {
    user: { id: "123", name: "John" },
  };
};

export const getCurrentUser = route
  .get()
  .use(authMiddleware)
  .handle(async (ctx) => {
    // ctx.user is now available
    return { user: ctx.user };
  });
```

## Multiple Middleware

Chain multiple middleware:

```typescript
const auth = async (ctx) => {
  return { user: { id: "123" } };
};

const timing = async (ctx) => {
  const start = Date.now();
  return { requestTime: start };
};

export const getUserWithTiming = route
  .get()
  .use(auth)
  .use(timing)
  .handle(async (ctx) => {
    return {
      user: ctx.user,
      requestTime: ctx.requestTime,
    };
  });
```

## Error Handling

Middleware can throw errors:

```typescript
const requireAdmin = async (ctx) => {
  if (!ctx.user?.isAdmin) {
    throw new Error("Forbidden");
  }
};

export const deleteResource = route
  .delete()
  .use(authMiddleware)
  .use(requireAdmin)
  .handle(async (ctx) => {
    // Only admins reach here
    return { deleted: true };
  });
```

## Async Middleware

Middleware supports async operations:

```typescript
const loadUser = async (ctx) => {
  const userId = ctx.params.id;
  const user = await db.users.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return { user };
};

export const getUser = route
  .get()
  .use(loadUser)
  .handle(async (ctx) => {
    // ctx.user is loaded from database
    return { user: ctx.user };
  });
```

## Reusable Middleware

Create reusable middleware:

```typescript
// middleware/auth.ts
export const requireAuth = async (ctx) => {
  const token = ctx.headers.get("authorization");

  if (!token) {
    throw new Error("Unauthorized");
  }

  const user = await verifyToken(token);
  return { user };
};

// middleware/cors.ts
export const cors = async (ctx) => {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    },
  };
};
```

Use in routes:

```typescript
import { requireAuth } from "@/middleware/auth";
import { cors } from "@/middleware/cors";

export const getProtectedUser = route
  .get()
  .use(cors)
  .use(requireAuth)
  .handle(async (ctx) => {
    return { user: ctx.user };
  });
```

## Conditional Middleware

Apply middleware conditionally:

```typescript
const optionalAuth = async (ctx) => {
  const token = ctx.headers.get("authorization");

  if (token) {
    const user = await verifyToken(token);
    return { user };
  }

  return { user: null };
};

export const getGreeting = route
  .get()
  .use(optionalAuth)
  .handle(async (ctx) => {
    if (ctx.user) {
      return { message: `Hello, ${ctx.user.name}` };
    }
    return { message: "Hello, guest" };
  });
```
