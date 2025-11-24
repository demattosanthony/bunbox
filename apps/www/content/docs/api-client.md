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

The client mirrors your route structure:

```typescript
// app/api/users/route.ts
export const GET = route.handle(async () => {
  return { users: [] };
});

// In your component
import { api } from "@/.bunbox/api-client";

const response = await api.users.GET();
// response is typed as { users: unknown[] }
```

## Type Safety

The client automatically infers types from your route handlers:

```typescript
// app/api/users/[id]/route.ts
export const GET = route.handle(async ({ params }) => {
  return { id: params.id, name: "John" };
});

// Client usage - fully typed!
const user = await api.users["[id]"].GET({ params: { id: "123" } });
// user is typed based on your return value
```

## Query Parameters

Pass query parameters:

```typescript
// app/api/search/route.ts
export const GET = route
  .query(z.object({ q: z.string() }))
  .handle(async ({ query }) => {
    return { results: [] };
  });

// Client usage
const results = await api.search.GET({ query: { q: "bunbox" } });
```

## Request Body

Send request bodies:

```typescript
// app/api/users/route.ts
export const POST = route
  .body(z.object({ name: z.string() }))
  .handle(async ({ body }) => {
    return { user: body };
  });

// Client usage
const user = await api.users.POST({ body: { name: "Alice" } });
```

## Route Parameters

Use dynamic route parameters:

```typescript
// app/api/users/[id]/route.ts
export const GET = route.handle(async ({ params }) => {
  return { id: params.id };
});

// Client usage
const user = await api.users["[id]"].GET({ params: { id: "123" } });
```

## Headers

Pass custom headers:

```typescript
const response = await api.users.GET({
  headers: {
    Authorization: "Bearer token",
  },
});
```

## Error Handling

Handle errors:

```typescript
try {
  const data = await api.users.GET();
} catch (error) {
  console.error("Request failed:", error);
}
```

## With useQuery Hook

Use the generated `useQuery` hook for React components:

```typescript
import { api } from "@/.bunbox/api-client";

export default function UsersPage() {
  const { data, loading, error, refetch } = api.users.GET.useQuery();

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
  const { data, latest, loading } = api.stream.GET.useStream();

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

The client mirrors your `app/api/` directory structure:

```
app/api/
├── users/
│   └── route.ts          -> api.users.GET, api.users.POST
└── posts/
    └── [id]/
        └── route.ts      -> api.posts["[id]"].GET
```

## Type Inference

Types are inferred from:

- Route parameters (from `route.params()`)
- Query parameters (from `route.query()`)
- Request body (from `route.body()`)
- Response type (from handler return value)

```typescript
// Fully typed!
const result = await api.users["[id]"].PUT({
  params: { id: "123" },
  body: { name: "New Name" },
  query: { update: "true" },
});
```
