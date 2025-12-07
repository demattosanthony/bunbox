---
title: Quick Start
description: Build your first Bunbox application in 5 minutes
order: 3
---

## Create a Project

```bash
bun create bunbox my-blog
cd my-blog
```

## Create a Home Page

The home page is already created at `app/page.tsx`. Let's update it:

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to My Blog</h1>
      <p>A simple blog built with Bunbox</p>
    </div>
  );
}
```

## Add a Blog Post Page

Create a dynamic route for blog posts:

```tsx
// app/blog/[slug]/page.tsx
interface BlogPostProps {
  params: { slug: string };
}

export default function BlogPost({ params }: BlogPostProps) {
  return (
    <article>
      <h1>Blog Post: {params.slug}</h1>
      <p>This is the blog post content.</p>
    </article>
  );
}
```

Now you can visit `/blog/hello-world` or any other slug!

## Create an API Route

Add an API endpoint to fetch posts:

```typescript
// app/api/posts/route.ts
import { route } from "@ademattos/bunbox";

const posts = [
  { id: 1, title: "First Post", slug: "first-post" },
  { id: 2, title: "Second Post", slug: "second-post" },
];

export const GET = route.handle(async () => {
  return { posts };
});
```

The API is available at `http://localhost:3000/api/posts`.

## Add a Layout

Create a layout to wrap all pages:

```tsx
// app/layout.tsx
"use server";

import React from "react";
import type { PageMetadata } from "@ademattos/bunbox";

export const metadata: PageMetadata = {
  title: "My Blog",
  description: "A simple blog built with Bunbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/blog/first-post">Blog</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

## Start the Server

```bash
bun dev
```

Visit `http://localhost:3000` to see your blog!

## What's Next?

- Learn more about [Pages and Routing](/docs/routing)
- Explore [API Routes](/docs/api-routes) in depth
- Add [WebSocket support](/docs/websockets) for real-time features
