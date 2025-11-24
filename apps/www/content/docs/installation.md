---
title: Installation
description: Get started with Bunbox in minutes
order: 2
---

## Prerequisites

Before you begin, make sure you have [Bun](https://bun.sh) installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Create a New Project

The fastest way to get started is with `bun create`:

```bash
bun create bunbox my-app
cd my-app
bun install
```

This will create a new Bunbox project with all the necessary dependencies.

## Start Development Server

Start the development server:

```bash
bun dev
```

Your app will be available at `http://localhost:3000`.

## Project Structure

A typical Bunbox project looks like this:

```
my-app/
├── app/
│   ├── page.tsx          # Home page (/)
│   ├── layout.tsx        # Root layout
│   ├── index.css         # Global styles
│   ├── about/
│   │   └── page.tsx      # About page (/about)
│   └── api/
│       └── users/
│           └── route.ts  # API route (/api/users)
├── public/
│   └── robots.txt        # Static files
├── bunbox.config.ts      # Configuration
├── package.json
└── tsconfig.json
```

## Configuration

Bunbox works with zero configuration, but you can customize it using `bunbox.config.ts`:

```typescript
import { defineConfig } from "@ademattos/bunbox";

export default defineConfig({
  port: 3000,
  appDir: "./app",
  publicDir: "./public",
});
```

## What's Next?

- Learn about [routing](/docs/routing) and file-based navigation
- Create your first [API route](/docs/api-routes)
- Explore [Server Components](/docs/server-components)
