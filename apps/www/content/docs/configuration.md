---
title: Configuration
description: Configure your Bunbox application
order: 13
category: Advanced
---

## Basic Configuration

Create `bunbox.config.ts` in your project root:

```typescript
import { defineConfig } from "@ademattos/bunbox";

export default defineConfig({
  port: 3000,
  appDir: "./app",
  publicDir: "./public",
});
```

## Configuration Options

### port

The port to run the server on.

- Type: `number`
- Default: `3000`

```typescript
export default defineConfig({
  port: 8080,
});
```

### appDir

The directory containing your application code.

- Type: `string`
- Default: `"./app"`

```typescript
export default defineConfig({
  appDir: "./src/app",
});
```

### publicDir

The directory containing static files.

- Type: `string`
- Default: `"./public"`

```typescript
export default defineConfig({
  publicDir: "./static",
});
```

### development

Enable development mode with hot reload.

- Type: `boolean`
- Default: `true` in dev, `false` in production

This is automatically set based on the command you run (`bun dev` vs `bun start`).

### openapi

Configure OpenAPI/Swagger documentation generation.

- Type: `object`
- Default: `undefined` (disabled)

```typescript
export default defineConfig({
  openapi: {
    enabled: true,
    path: "/api/docs",           // Where to serve docs
    title: "My API",             // API title
    version: "1.0.0",            // API version
    description: "API description",
    servers: [
      { url: "https://api.example.com", description: "Production" },
    ],
  },
});
```

When enabled, serves:
- **Swagger UI** at `/api/docs`
- **OpenAPI spec** at `/api/docs/openapi.json`

See [OpenAPI & Swagger](/docs/openapi) for full documentation.

### cors

Configure CORS (Cross-Origin Resource Sharing) for API routes.

- Type: `boolean | CorsConfig`
- Default: `undefined` (disabled)

Enable with permissive defaults (allows all origins):

```typescript
export default defineConfig({
  cors: true,
});
```

Or configure specific options:

```typescript
export default defineConfig({
  cors: {
    origin: "https://example.com",        // Allowed origin(s)
    methods: ["GET", "POST"],             // Allowed methods
    allowedHeaders: ["Content-Type"],     // Allowed request headers
    exposedHeaders: ["X-Custom-Header"],  // Headers exposed to browser
    credentials: true,                    // Allow credentials
    maxAge: 86400,                        // Preflight cache duration (seconds)
  },
});
```

#### CORS Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `origin` | `string \| string[] \| (origin: string) => boolean` | `"*"` | Allowed origins |
| `methods` | `string[]` | `["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]` | Allowed HTTP methods |
| `allowedHeaders` | `string[]` | `["Content-Type", "Authorization"]` | Headers the client can send |
| `exposedHeaders` | `string[]` | `[]` | Headers exposed to the client |
| `credentials` | `boolean` | `false` | Allow cookies/auth headers |
| `maxAge` | `number` | `86400` | Preflight response cache time |

#### Dynamic Origin Validation

Use a function for dynamic origin validation:

```typescript
export default defineConfig({
  cors: {
    origin: (origin) => {
      const allowed = ["https://app.example.com", "https://admin.example.com"];
      return allowed.includes(origin);
    },
    credentials: true,
  },
});
```

#### Multiple Origins

Allow specific origins:

```typescript
export default defineConfig({
  cors: {
    origin: ["https://app.example.com", "https://admin.example.com"],
  },
});
```

## Environment Variables

Use `.env` files for environment-specific configuration:

```bash
# .env
DATABASE_URL=postgresql://localhost/mydb
API_KEY=your-secret-key
```

Access in your code:

```typescript
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

## TypeScript Configuration

Customize TypeScript with `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "esnext",
    "target": "esnext",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Build Configuration

For production builds, Bunbox automatically:

- Minifies JavaScript
- Optimizes React
- Bundles dependencies
- Generates source maps

No additional configuration needed!
