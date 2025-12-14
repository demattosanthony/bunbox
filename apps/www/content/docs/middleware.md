---
title: Middleware
description: Add middleware to your API routes
order: 11
category: API Routes
---

## Overview

API middleware runs on your API routes using the `.use()` method.

## Basic Usage

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

// Use in routes
import { requireAuth } from "@/middleware/auth";

export const getProtectedUser = route
  .get()
  .use(requireAuth)
  .handle(async (ctx) => {
    return { user: ctx.user };
  });
```

> **Note:** For CORS configuration, use `bunbox.config.ts` instead of middleware. See [Configuration](/docs/configuration#cors) for details.
