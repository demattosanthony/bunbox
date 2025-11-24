---
title: useQuery Hook
description: React hook for fetching data from API routes
order: 9.5
category: API Routes
---

## Overview

The `useQuery` hook provides a React hook for fetching data from your API routes. It's automatically generated for each API route.

## Basic Usage

```tsx
import { api } from "@/.bunbox/api-client";

export default function UsersPage() {
  const { data, loading, error, refetch } = api.users.GET.useQuery();

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

Pass query parameters:

```tsx
const { data } = api.users.GET.useQuery({
  query: { role: "admin" },
});
```

## Route Parameters

Use dynamic route parameters:

```tsx
const { data } = api.users["[id]"].GET.useQuery({
  params: { id: "123" },
});
```

## Request Body

Send request bodies:

```tsx
const { data } = api.users.POST.useQuery({
  body: { name: "Alice", email: "alice@example.com" },
});
```

## Conditional Fetching

Disable automatic fetching:

```tsx
const { data, start } = api.users.GET.useQuery({
  enabled: false, // Don't fetch automatically
});

// Manually trigger fetch
<button onClick={start}>Load Users</button>;
```

## Refetching

Manually refetch data:

```tsx
const { data, refetch } = api.users.GET.useQuery();

<button onClick={() => refetch()}>Refresh</button>;
```

## Custom Headers

Pass custom headers:

```tsx
const { data } = api.users.GET.useQuery({
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

  const { data, loading, error, refetch } = api.users.GET.useQuery({
    query: roleFilter ? { role: roleFilter } : {},
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
const { data, error } = api.users.GET.useQuery();

if (error) {
  return <div>Failed to load: {error.message}</div>;
}
```

## Loading States

Track loading state:

```tsx
const { data, loading } = api.users.GET.useQuery();

return (
  <div>
    {loading && <div>Loading...</div>}
    {data && <div>{JSON.stringify(data)}</div>}
  </div>
);
```
