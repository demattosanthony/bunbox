---
title: API Client
description: Type-safe auto-generated API client for calling your routes
order: 8.5
category: API Routes
---

## Overview

Bunbox automatically generates a type-safe API client from your API routes. Import it from `.bunbox/api-client`:

```typescript
import { api } from "@/.bunbox/api-client";
```

## Using the API Client

The client mirrors your route structure, using your exported handler names as method names:

```typescript
// app/api/users/route.ts
export const listUsers = route.get().handle(async () => {
  return { users: [] };
});

// In your component
import { api } from "@/.bunbox/api-client";

const response = await api.users.listUsers();
// response is typed as { users: unknown[] }
```

## Type Safety

The client automatically infers types from your route handlers:

```typescript
// app/api/users/[id]/route.ts
export const getUser = route.get().handle(async ({ params }) => {
  return { id: params.id, name: "John" };
});

// Client usage - fully typed with flattened params!
const user = await api.users.getUser({ id: "123" });
// user is typed based on your return value
```

## Query Parameters

Query parameters are flattened into the options object:

```typescript
// app/api/search/route.ts
export const search = route
  .get()
  .query(z.object({ q: z.string() }))
  .handle(async ({ query }) => {
    return { results: [] };
  });

// Client usage - query params are flattened
const results = await api.search.search({ q: "bunbox" });
```

## Request Body

For POST/PUT/PATCH requests, body fields are flattened:

```typescript
// app/api/users/route.ts
export const createUser = route
  .post()
  .body(z.object({ name: z.string() }))
  .handle(async ({ body }) => {
    return { user: body };
  });

// Client usage - body fields are flattened
const user = await api.users.createUser({ name: "Alice" });
```

## Route Parameters

Dynamic route parameters are flattened into the options object:

```typescript
// app/api/users/[id]/route.ts
export const getUser = route.get().handle(async ({ params }) => {
  return { id: params.id };
});

// Client usage - params are flattened (no nested { params: {} })
const user = await api.users.getUser({ id: "123" });
```

## Headers

Pass custom headers (the only non-flattened option):

```typescript
const response = await api.users.listUsers({
  headers: {
    Authorization: "Bearer token",
  },
});
```

## Error Handling

Handle errors:

```typescript
try {
  const data = await api.users.listUsers();
} catch (error) {
  console.error("Request failed:", error);
}
```

## With useQuery Hook

Use the generated `useQuery` hook for React components:

```typescript
import { api } from "@/.bunbox/api-client";

export default function UsersPage() {
  const { data, loading, error, refetch } = api.users.listUsers.useQuery();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## With useStream Hook

For streaming endpoints:

```typescript
import { api } from "@/.bunbox/api-client";

export default function StreamPage() {
  const { data, latest, loading } = api.stream.streamTokens.useStream();

  return <div>{latest?.token}</div>;
}
```

## Regenerating the Client

The API client is automatically regenerated when you:

- Start the dev server (`bun dev`)
- Build for production (`bun run build`)

You can also manually regenerate it by running:

```bash
bun run build
```

## Client Structure

The client mirrors your `app/api/` directory structure, with handler names as methods:

```
app/api/
├── users/
│   └── route.ts          -> api.users.listUsers, api.users.createUser
└── posts/
    └── [id]/
        └── route.ts      -> api.posts.getPost (dynamic segments are flattened)
```

## Type Inference

Types are inferred from:

- Route parameters (from `route.params()`)
- Query parameters (from `route.query()`)
- Request body (from `route.body()`)
- Response type (from handler return value)

```typescript
// Fully typed with flattened options!
const result = await api.users.updateUser({
  id: "123",           // from route params
  name: "New Name",    // from body
  notify: "true",      // from query (for GET/DELETE) or body (for POST/PUT/PATCH)
});
```

## Flattened Options

The API client uses flattened options for better DX:

- **Route params**: Directly in options (e.g., `{ id: "123" }`)
- **Query params** (GET/DELETE): Directly in options (e.g., `{ role: "admin" }`)
- **Body fields** (POST/PUT/PATCH): Directly in options (e.g., `{ name: "John" }`)
- **Headers**: Always under `headers` key
- **Hook options**: `enabled`, `onMessage`, `onError`, `onFinish`

```typescript
// GET request - id goes to params, role goes to query
api.users.getUser({ id: "123", role: "admin" });

// POST request - id goes to params, name goes to body
api.users.updateUser({ id: "123", name: "New Name" });
```
