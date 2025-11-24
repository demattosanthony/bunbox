---
title: Pages
description: Creating and organizing pages in Bunbox
order: 5
category: Core Concepts
---

## Creating a Page

Create a `page.tsx` file to define a page:

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Welcome to our about page!</p>
    </div>
  );
}
```

This creates a page at `/about`.

## Page Props

Pages receive `params` and `query` as props:

```tsx
interface PageProps {
  params: Record<string, string>;
  query: Record<string, string>;
}

export default function Page({ params, query }: PageProps) {
  return (
    <div>
      <h1>Params: {JSON.stringify(params)}</h1>
      <p>Query: {JSON.stringify(query)}</p>
    </div>
  );
}
```

## Server Components

By default, pages are client-side rendered. Add `"use server"` directive for server-side rendering:

```tsx
"use server";

export default function ServerPage() {
  const data = await fetchData(); // Server-side data fetching
  return <div>{data}</div>;
}
```

## Page Metadata

Export metadata for SEO:

```tsx
"use server";

import type { PageMetadata } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "About Us",
  description: "Learn more about our company",
  keywords: ["about", "company"],
};

export default function AboutPage() {
  return <div>About Us</div>;
}
```

## Data Fetching

Fetch data directly in server components:

```tsx
"use server";

async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json();
}

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## Client Components

For interactive components, use `"use client"`:

```tsx
"use client";

import { useState } from "react";

export default function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

## Not Found Pages

Create a custom 404 page:

```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <a href="/">Go Home</a>
    </div>
  );
}
```
