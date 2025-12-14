---
title: Page Middleware
description: Protect pages and handle authentication with middleware
order: 7.5
category: Core Concepts
---

## Overview

Page middleware protects routes and handles authentication. Use `middleware.ts` files in your `app` directory.

## Creating Middleware

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

## Accessing Context

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

## Public Routes

Override parent middleware for public routes:

```typescript
// app/auth/middleware.ts
export async function middleware() {
  // Return empty object to allow access
  return {};
}
```

This makes all `/auth` routes public, overriding the root middleware.

## Role-Based Access

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

## Cascading Middleware

Middleware executes from child to parent:

1. `app/admin/middleware.ts` (runs first)
2. `app/middleware.ts` (runs if child returns undefined)

This allows specific routes to override general protection.

## Cookie Utilities

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

## Complete Example

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
