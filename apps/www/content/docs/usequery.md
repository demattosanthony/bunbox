---
title: useQuery Hook
description: React hook for fetching data from API routes
order: 9.5
category: API Routes
---

## Overview

The `useQuery` hook provides a React hook for fetching data from your API routes. It's automatically generated for each API route handler.

## Basic Usage

```tsx
import { api } from "@/.bunbox/api-client";

export default function UsersPage() {
  const { data, loading, error, refetch } = api.users.listUsers.useQuery();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## Hook Return Values

```typescript
{
  data: TResponse | undefined; // Response data
  loading: boolean; // Loading state
  error: Error | undefined; // Error if request failed
  refetch: () => Promise<void>; // Manually refetch
}
```

## Query Parameters

Query parameters are flattened into the options object:

```tsx
const { data } = api.users.listUsers.useQuery({
  role: "admin",  // Directly in options, not nested
});
```

## Route Parameters

Dynamic route parameters are also flattened:

```tsx
// For route: /api/users/[id]/route.ts
const { data } = api.users.getUser.useQuery({
  id: "123",  // Flattened, not { params: { id } }
});
```

## Request Body

For POST/PUT/PATCH handlers, body fields are flattened:

```tsx
const { data } = api.users.createUser.useQuery({
  name: "Alice",
  email: "alice@example.com",
});
```

## Conditional Fetching

Disable automatic fetching:

```tsx
const { data, refetch } = api.users.listUsers.useQuery({
  enabled: false, // Don't fetch automatically
});

// Manually trigger fetch
<button onClick={refetch}>Load Users</button>;
```

## Refetching

Manually refetch data:

```tsx
const { data, refetch } = api.users.listUsers.useQuery();

<button onClick={() => refetch()}>Refresh</button>;
```

## Custom Headers

Pass custom headers:

```tsx
const { data } = api.users.listUsers.useQuery({
  headers: {
    Authorization: "Bearer token",
  },
});
```

## Complete Example

```tsx
import { useState } from "react";
import { api } from "@/.bunbox/api-client";

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<"admin" | "user" | "">("");

  // Query params are flattened - just pass role directly
  const { data, loading, error, refetch } = api.users.listUsers.useQuery({
    ...(roleFilter ? { role: roleFilter } : {}),
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <select
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value as any)}
      >
        <option value="">All</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>

      <button onClick={() => refetch()}>Refresh</button>

      <ul>
        {data?.users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Caching

The hook automatically caches responses based on the request parameters. Subsequent calls with the same parameters return cached data.

## Error Handling

Handle errors:

```tsx
const { data, error } = api.users.listUsers.useQuery();

if (error) {
  return <div>Failed to load: {error.message}</div>;
}
```

## Loading States

Track loading state:

```tsx
const { data, loading } = api.users.listUsers.useQuery();

return (
  <div>
    {loading && <div>Loading...</div>}
    {data && <div>{JSON.stringify(data)}</div>}
  </div>
);
```

## Combining Parameters

For routes with multiple parameter types, everything is flattened:

```tsx
// Route: /api/users/[id]/route.ts with query params
const { data } = api.users.getUser.useQuery({
  id: "123",        // Route param - goes to URL
  expand: "posts",  // Query param - goes to URL query string
  enabled: true,    // Hook option - controls fetching
});
```
