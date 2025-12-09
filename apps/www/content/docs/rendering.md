---
title: Rendering
description: How Bunbox renders and hydrates your React application
order: 3.5
category: Getting Started
---

## Overview

Bunbox uses traditional server-side rendering (SSR) with full client hydration. Every page is:

1. **Rendered on the server** - React components render to HTML
2. **Sent to the browser** - Users see content immediately
3. **Hydrated on the client** - React attaches event handlers and makes the page interactive

This is not React Server Components (RSC). All your components run on both the server and client.

## How It Works

### Server Request

When a request comes in:

```
Browser Request → Server
                    ↓
              Run loader() (if exported)
                    ↓
              Render React tree to HTML
                    ↓
              Send HTML + loader data to browser
```

### Client Hydration

Once the HTML arrives:

```
Browser receives HTML
        ↓
  Display content (fast!)
        ↓
  Load client JavaScript
        ↓
  React hydrates the DOM
        ↓
  Page is now interactive
```

## What This Means for You

### All Components Are Interactive

Since everything is hydrated, React hooks work everywhere:

```tsx
// This works in any component - pages, layouts, anywhere
import { useState, useEffect } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Component mounted on client");
  }, []);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### Server Code in Loaders

Keep server-only code in `loader` functions:

```tsx
import type { LoaderContext, PageProps } from "@ademattos/bunbox";

// This only runs on the server
export async function loader({ params }: LoaderContext) {
  // Safe to use:
  // - Database connections
  // - Environment variables
  // - File system
  // - Private API keys
  const user = await db.getUser(params.id);
  return { user };
}

// This runs on server (SSR) AND client (hydration)
export default function UserPage({ data }: PageProps) {
  const { user } = data as { user: User };
  return <h1>{user.name}</h1>;
}
```

### No "use client" Directives

Unlike Next.js App Router, you don't need `"use client"` directives. Every component is automatically available on the client after hydration.

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                        Server                           │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  loader  │ →  │ loaderData   │ →  │  SSR React   │  │
│  │  (data)  │    │ (serialized) │    │  (HTML)      │  │
│  └──────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                       Browser                           │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ loaderData   │ →  │ React Hydrate│ → Interactive!   │
│  │ (window obj) │    │ (attach DOM) │                  │
│  └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## Client Navigation

When navigating between pages on the client:

1. Bunbox fetches the new page's loader data from the server
2. Re-renders the React tree with new data
3. No full page reload - smooth SPA experience

```tsx
import { useRouter } from "@ademattos/bunbox/client";

export default function Navigation() {
  const { navigate, isNavigating } = useRouter();

  return (
    <button onClick={() => navigate("/about")}>
      {isNavigating ? "Loading..." : "Go to About"}
    </button>
  );
}
```

## Benefits

### Performance

- Fast initial page load (HTML is ready)
- No loading spinners for initial content
- Smooth client-side navigation after hydration

### SEO

- Search engines see fully rendered HTML
- Social media previews work correctly
- No JavaScript required for content visibility

### Developer Experience

- Use React hooks anywhere
- No mental model split between server/client components
- Familiar React patterns just work

## Comparison

| Feature       | Bunbox          | Next.js App Router       |
| ------------- | --------------- | ------------------------ |
| Rendering     | SSR + Hydration | React Server Components  |
| Hooks         | Work everywhere | Client components only   |
| Directives    | None needed     | "use client" required    |
| Data fetching | Loaders         | async components / fetch |
| Mental model  | Simple          | More complex             |
