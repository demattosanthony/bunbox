---
title: Data Loading
description: Server-side data loading with loaders
order: 7
category: Core Concepts
---

## Overview

Bunbox uses a loader pattern for server-side data fetching. Loaders run on the server and pass data to your page components.

## Basic Loader

Export a `loader` function from your page:

```tsx
import type { LoaderContext, PageProps } from "@ademattos/bunbox";

export async function loader({ params, query }: LoaderContext) {
  const data = await fetchFromDatabase();
  return { data };
}

export default function Page({ data }: PageProps) {
  const { data: pageData } = data as { data: DataType };

  return (
    <div>
      <h1>Server Loaded Data</h1>
      <pre>{JSON.stringify(pageData, null, 2)}</pre>
    </div>
  );
}
```

## Loader Context

The loader receives params and query:

```tsx
export async function loader({ params, query }: LoaderContext) {
  // params: URL path parameters (e.g., { id: "123" } for /users/[id])
  // query: URL query parameters (e.g., { page: "1" } for ?page=1)

  const user = await db.getUser(params.id);
  const page = parseInt(query.page || "1");

  return { user, page };
}
```

## When Loaders Run

Loaders execute:

1. **Initial page load** - On the server before sending HTML
2. **Client-side navigation** - Via fetch request to the server

This ensures data is always fresh when navigating.

## Database Access

Access your database directly in loaders:

```tsx
import { db } from "@/lib/db";

export async function loader({ params }: LoaderContext) {
  const products = await db.product.findMany({
    where: { categoryId: params.categoryId },
    orderBy: { createdAt: "desc" },
  });

  return { products };
}

export default function ProductsPage({ data }: PageProps) {
  const { products } = data as { products: Product[] };

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

## API Calls

Fetch from external APIs:

```tsx
export async function loader({ params }: LoaderContext) {
  const res = await fetch(`https://api.example.com/users/${params.id}`, {
    headers: { Authorization: `Bearer ${process.env.API_KEY}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return { user: await res.json() };
}
```

## Error Handling

Handle errors in loaders:

```tsx
export async function loader({ params }: LoaderContext) {
  const user = await db.getUser(params.id);

  if (!user) {
    throw new Error("User not found");
  }

  return { user };
}
```

## Benefits

### Performance
- Data is ready on initial page load (no loading spinners)
- Pages are server-rendered with data for fast perceived performance

### Security
- Keep API keys on the server
- Database credentials never reach the client
- Sensitive logic stays private

### SEO
- Full HTML sent to search engines
- Data is embedded in the initial response
- Better crawlability and social media previews

## Interactive Pages

Loaders work seamlessly with React hooks:

```tsx
import { useState, useEffect } from "react";
import type { LoaderContext, PageProps } from "@ademattos/bunbox";

export async function loader({ params }: LoaderContext) {
  const initialComments = await db.getComments(params.postId);
  return { initialComments };
}

export default function PostPage({ params, data }: PageProps) {
  const { initialComments } = data as { initialComments: Comment[] };
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");

  async function addComment() {
    const res = await fetch(`/api/posts/${params.postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text: newComment }),
    });
    const comment = await res.json();
    setComments([...comments, comment]);
    setNewComment("");
  }

  return (
    <div>
      <h1>Comments</h1>
      {comments.map((c) => (
        <p key={c.id}>{c.text}</p>
      ))}
      <input value={newComment} onChange={(e) => setNewComment(e.target.value)} />
      <button onClick={addComment}>Add Comment</button>
    </div>
  );
}
```

## Without Loaders

Pages without loaders work normally - they're server-rendered without data:

```tsx
export default function StaticPage() {
  return (
    <div>
      <h1>Static Content</h1>
      <p>No server data needed here.</p>
    </div>
  );
}
```
