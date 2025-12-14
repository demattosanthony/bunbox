---
title: Middleware
description: Add middleware to your API routes and pages
order: 11
category: API Routes
---

## API Middleware

API middleware runs on your API routes using the `.use()` method.

### Creating Middleware

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

### Adding Context

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

### Multiple Middleware

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

### Error Handling

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

### Reusable Middleware

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

---

## Page Middleware

Page middleware protects routes and handles authentication. Use `middleware.ts` files in your `app` directory.

### Creating Middleware

Create a `middleware.ts` file to protect routes:

```typescript
// app/middleware.ts
import { redirect, getCookie } from "@ademattos/bunbox";
import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware({ request }: MiddlewareContext) {
  const authToken = getCookie(request, "auth_token");

  if (!authToken) {
    return redirect("/auth/login");
  }

  // Add user to context
  return {
    user: { id: "123", role: "user" },
  };
}
```

This protects all routes. Unauthenticated users are redirected to `/auth/login`.

### Accessing Context

Middleware data flows to loaders and pages:

```tsx
import type { LoaderContext, PageProps } from "@ademattos/bunbox";

export async function loader({ context }: LoaderContext) {
  // Access middleware data
  return {
    user: context.user,
  };
}

export default function Page({ data }: PageProps) {
  const { user } = data as { user: User };
  return <h1>Welcome, {user.name}</h1>;
}
```

### Public Routes

Override parent middleware for public routes:

```typescript
// app/auth/middleware.ts
export async function middleware() {
  // Return empty object to allow access
  return {};
}
```

This makes all `/auth` routes public, overriding the root middleware.

### Role-Based Access

Restrict routes by role:

```typescript
// app/admin/middleware.ts
import { redirect } from "@ademattos/bunbox";
import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware({ context }: MiddlewareContext) {
  const user = context.user as { role: string };

  if (user.role !== "admin") {
    return redirect("/dashboard");
  }

  return { user };
}
```

Only admin users can access `/admin` routes.

### Cascading Middleware

Middleware executes from child to parent:

1. `app/admin/middleware.ts` (runs first)
2. `app/middleware.ts` (runs if child returns undefined)

This allows specific routes to override general protection.

### Cookie Utilities

Built-in helpers for auth:

```typescript
import { getCookie, setCookie, deleteCookie, redirect } from "@ademattos/bunbox";

export async function middleware({ request }: MiddlewareContext) {
  // Get cookie
  const token = getCookie(request, "auth_token");

  // Set cookie
  const response = redirect("/dashboard");
  setCookie(response, "session_id", "abc123", {
    httpOnly: true,
    secure: true,
    maxAge: 3600,
  });

  return response;
}
```

### Complete Example

Authentication flow:

```typescript
// app/middleware.ts - Protect all routes
import { redirect, getCookie } from "@ademattos/bunbox";

export async function middleware({ request }) {
  const token = getCookie(request, "auth_token");

  if (!token) {
    return redirect("/auth/login");
  }

  const user = await validateToken(token);
  return { user };
}
```

```typescript
// app/auth/middleware.ts - Allow public access
export async function middleware() {
  return {};
}
```

```typescript
// app/admin/middleware.ts - Require admin
import { redirect } from "@ademattos/bunbox";

export async function middleware({ context }) {
  if (context.user?.role !== "admin") {
    return redirect("/dashboard");
  }
}
```

See the [middleware-auth example](https://github.com/demattosanthony/bunbox/tree/main/examples/middleware-auth) for a complete implementation.
