---
title: Client-Side Routing
description: Navigate between pages with client-side routing hooks
order: 6.5
category: Core Concepts
---

## Overview

Bunbox provides client-side routing hooks for programmatic navigation and accessing route information.

## useRouter Hook

Access router state and navigation:

```tsx
"use client";

import { useRouter } from "@ademattos/bunbox/client";

export default function Navigation() {
  const { pathname, navigate, params } = useRouter();

  return (
    <div>
      <p>Current path: {pathname}</p>
      <button onClick={() => navigate("/about")}>Go to About</button>
    </div>
  );
}
```

## Router Return Values

```typescript
{
  pathname: string;                    // Current pathname
  navigate: (path: string) => void;     // Navigate to path
  params: Record<string, string>;       // Route parameters
}
```

## useParams Hook

Access route parameters:

```tsx
"use client";

import { useParams } from "@ademattos/bunbox/client";

export default function BlogPost() {
  const { slug } = useParams();

  return <div>Post: {slug}</div>;
}
```

## navigate Function

Navigate programmatically:

```tsx
"use client";

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
"use client";

import { useRouter, useParams } from "@ademattos/bunbox/client";

export default function UserProfile() {
  const { id } = useParams();
  const { navigate, pathname } = useRouter();

  return (
    <div>
      <h1>User Profile: {id}</h1>
      <p>Current path: {pathname}</p>
      <button onClick={() => navigate("/")}>Go Home</button>
    </div>
  );
}
```

## Navigation Behavior

- Client-side navigation is used for non-SSR pages
- SSR pages trigger full page reloads
- Browser back/forward buttons work automatically
- Scroll position resets on navigation

## Route Parameters

Access dynamic route parameters:

```tsx
// app/blog/[slug]/page.tsx
"use client";

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

function handleSubmit() {
  // Process form
  navigate("/success");
}
```

## SSR Pages

SSR pages (`"use server"`) use full page reloads for navigation. Client-side navigation hooks work for client-rendered pages.
