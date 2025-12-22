# Basic Bunbox Example

This is a basic example application demonstrating the features of Bunbox.

## Running the Example

```bash
# Development mode with hot reload
bun dev

# Production mode
bun start
```

## What's Included

- **Pages**: Examples of static and dynamic routes
- **Layouts**: Shared layout with metadata
- **API Routes**: REST endpoints with streaming
- **Styling**: Global CSS with modern styling

## Structure

```
app/
├── page.tsx              # Home page
├── layout.tsx            # Root layout
├── about/page.tsx        # About page
├── ssr-example/page.tsx  # Server-side rendered page
├── stream-demo/page.tsx  # Streaming demo
├── users/page.tsx        # useQuery demo
├── api/
│   ├── health/route.ts   # Health check endpoint
│   ├── users/route.ts    # Users API
│   └── stream/route.ts   # Streaming endpoint
└── public/               # Static assets
```
