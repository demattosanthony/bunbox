---
title: Client-Side Routing
description: Navigate between pages with client-side routing hooks
order: 6.5
category: Core Concepts
---

## Overview

Bunbox provides client-side routing hooks for programmatic navigation and accessing route information. All navigation is handled client-side with automatic data loading.

## useRouter Hook

Access router state and navigation:

```tsx
import { useRouter } from "@ademattos/bunbox/client";

export default function Navigation() {
  const { pathname, navigate, params, isNavigating } = useRouter();

  return (
    <div>
      <p>Current path: {pathname}</p>
      {isNavigating && <p>Loading...</p>}
      <button onClick={() => navigate("/about")}>Go to About</button>
    </div>
  );
}
```

## Router Return Values

```typescript
{
  pathname: string;                          // Current pathname
  navigate: (path: string) => Promise<void>; // Navigate to path
  params: Record<string, string>;            // Route parameters
  isNavigating: boolean;                     // True during navigation
}
```

## useParams Hook

Access route parameters:

```tsx
import { useParams } from "@ademattos/bunbox/client";

export default function BlogPost() {
  const { slug } = useParams();

  return <div>Post: {slug}</div>;
}
```

## navigate Function

Navigate programmatically:

```tsx
import { navigate } from "@ademattos/bunbox/client";

export default function Button() {
  const handleClick = () => {
    navigate("/dashboard");
  };

  return <button onClick={handleClick}>Go to Dashboard</button>;
}
```

## Link Navigation

Use regular anchor tags for navigation:

```tsx
<a href="/about">About</a>
<a href="/blog/my-post">Blog Post</a>
```

Links are automatically intercepted for client-side navigation.

## Complete Example

```tsx
import { useRouter, useParams } from "@ademattos/bunbox/client";

export default function UserProfile() {
  const { id } = useParams();
  const { navigate, pathname, isNavigating } = useRouter();

  return (
    <div>
      <h1>User Profile: {id}</h1>
      <p>Current path: {pathname}</p>
      {isNavigating ? (
        <p>Navigating...</p>
      ) : (
        <button onClick={() => navigate("/")}>Go Home</button>
      )}
    </div>
  );
}
```

## Navigation Behavior

- All navigation is client-side (SPA-style)
- Loaders run on the server for each navigation
- Browser back/forward buttons work automatically
- Scroll position resets on navigation
- `isNavigating` is true while fetching loader data

## Route Parameters

Access dynamic route parameters:

```tsx
// app/blog/[slug]/page.tsx
import { useParams } from "@ademattos/bunbox/client";

export default function BlogPost() {
  const { slug } = useParams();

  return <article>Post: {slug}</article>;
}
```

## Query Parameters

Query parameters are available in page props:

```tsx
export default function SearchPage({
  query,
}: {
  query: Record<string, string>;
}) {
  return <div>Search: {query.q}</div>;
}
```

## Programmatic Navigation

Navigate programmatically:

```tsx
import { navigate } from "@ademattos/bunbox/client";

async function handleSubmit() {
  // Process form
  await navigate("/success");
}
```

## Loading States

Show loading indicators during navigation:

```tsx
import { useRouter } from "@ademattos/bunbox/client";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isNavigating } = useRouter();

  return (
    <div>
      {isNavigating && <div className="loading-bar" />}
      {children}
    </div>
  );
}
```
