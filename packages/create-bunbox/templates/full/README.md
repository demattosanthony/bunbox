# {{projectName}}

A full-featured [Bunbox](https://github.com/demattosanthony/bunbox) application with WebSockets, streaming, and more.

## Getting Started

```bash
# Start development server
bun dev

# Build for production
bun build

# Start production server
bun start
```

## Features

This template includes:

- **Pages** - File-based routing with React
- **API Routes** - REST endpoints with type-safe handlers
- **WebSockets** - Real-time chat example with type-safe protocols
- **Streaming** - Server-Sent Events (SSE) example

## Project Structure

```
├── app/
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout
│   ├── index.css             # Global styles
│   ├── about/
│   │   └── page.tsx          # About page
│   ├── chat/
│   │   └── page.tsx          # WebSocket chat demo
│   ├── stream-demo/
│   │   └── page.tsx          # SSE streaming demo
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts      # Health check endpoint
│   │   └── stream/
│   │       └── route.ts      # SSE endpoint
│   └── sockets/
│       └── chat/
│           ├── route.ts      # WebSocket handlers
│           └── protocol.ts   # Type-safe protocol
├── public/                   # Static assets
├── bunbox.config.ts          # Bunbox configuration
└── package.json
```

## Learn More

- [Bunbox Documentation](https://github.com/demattosanthony/bunbox)
- [Bun Documentation](https://bun.sh/docs)
