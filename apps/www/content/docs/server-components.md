---
title: Server Components
description: React Server Components in Bunbox
order: 7
category: Core Concepts
---

## What are Server Components?

Server Components render on the server and send HTML to the client. They can:

- Access backend resources directly
- Keep sensitive logic on the server
- Reduce client-side JavaScript
- Improve initial page load

## Using Server Components

Add the `"use server"` directive:

```tsx
"use server";

export default async function ServerPage() {
  const data = await fetchFromDatabase();

  return (
    <div>
      <h1>Server Rendered</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

## Data Fetching

Fetch data directly in server components:

```tsx
"use server";

async function getProducts() {
  const res = await fetch("https://api.example.com/products");
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

## Mixing Client and Server

Combine server and client components:

```tsx
"use server";

import ClientCounter from "./client-counter";

async function getData() {
  return { count: 42 };
}

export default async function MixedPage() {
  const data = await getData();

  return (
    <div>
      <h1>Server: {data.count}</h1>
      <ClientCounter initialCount={data.count} />
    </div>
  );
}
```

```tsx
// client-counter.tsx
"use client";

import { useState } from "react";

export default function ClientCounter({ initialCount }) {
  const [count, setCount] = useState(initialCount);

  return <button onClick={() => setCount(count + 1)}>Client: {count}</button>;
}
```

## Benefits

### Performance

- Smaller client bundles
- Faster initial load
- Reduced JavaScript parsing

### Security

- Keep API keys on server
- Database queries stay private
- Sensitive logic hidden from client

### SEO

- HTML sent to search engines
- Better crawlability
- Improved social media previews

## Streaming SSR

Server components support streaming:

```tsx
"use server";

import { Suspense } from "react";

async function SlowComponent() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return <div>Loaded!</div>;
}

export default function StreamingPage() {
  return (
    <div>
      <h1>Instant Content</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

The page renders immediately with a loading state, then streams the slow component when ready.

## Limitations

Server components cannot:

- Use hooks (`useState`, `useEffect`, etc.)
- Use browser-only APIs
- Add event listeners
- Use client-side state

For these features, use client components with `"use client"`.
