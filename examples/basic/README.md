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
- **API Routes**: REST endpoints
- **WebSockets**: Real-time chat example
- **Styling**: Global CSS with modern styling

## Structure

```
app/
├── page.tsx              # Home page
├── layout.tsx            # Root layout
├── about/page.tsx        # About page
├── ssr-example/page.tsx  # Server-side rendered page
├── api/
│   ├── health/route.ts   # Health check endpoint
│   └── users/[id]/route.ts  # Dynamic user API
└── ws/
    └── chat/route.ts     # WebSocket chat handler
```
