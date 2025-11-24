---
title: Routing
description: Learn about file-based routing in Bunbox - where the structure of your `app/` directory determines your application's routes.
order: 4
category: Core Concepts
---

## Basic Routing

Create a `page.tsx` file in any directory to define a route:

```
app/
├── page.tsx              -> /
├── about/
│   └── page.tsx          -> /about
└── blog/
    └── page.tsx          -> /blog
```

## Dynamic Routes

Use square brackets `[param]` to create dynamic routes:

```
app/
└── blog/
    └── [slug]/
        └── page.tsx      -> /blog/:slug
```

Access the parameter in your component:

```tsx
interface BlogPostProps {
  params: { slug: string };
}

export default function BlogPost({ params }: BlogPostProps) {
  return <h1>Post: {params.slug}</h1>;
}
```

## Nested Routes

Create nested routes by nesting directories:

```
app/
└── dashboard/
    ├── page.tsx          -> /dashboard
    ├── settings/
    │   └── page.tsx      -> /dashboard/settings
    └── profile/
        └── page.tsx      -> /dashboard/profile
```

## Query Parameters

Access query parameters through the `query` prop:

```tsx
interface PageProps {
  query: Record<string, string>;
}

export default function SearchPage({ query }: PageProps) {
  return <div>Search: {query.q}</div>;
}
```

Visit `/search?q=bunbox` to see "Search: bunbox".

## Navigation

Use regular anchor tags for navigation:

```tsx
<a href="/about">About</a>
<a href="/blog/my-post">Blog Post</a>
```

## Route Priority

When multiple routes could match a URL, Bunbox uses this priority:

1. Static routes (exact matches)
2. Dynamic routes (with parameters)
3. Catch-all routes

More specific routes always take precedence over less specific ones.
