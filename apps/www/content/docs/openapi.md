---
title: OpenAPI & Swagger
description: Auto-generate API documentation with Swagger UI
order: 11
category: API Routes
---

## Overview

Bunbox automatically generates OpenAPI 3.1 specs from your route definitions and serves an interactive Swagger UI for testing your API.

## Quick Start

Enable OpenAPI in your config:

```typescript
// bunbox.config.ts
export default {
  openapi: {
    enabled: true,
    title: "My API",
    version: "1.0.0",
  },
};
```

That's it! Visit:
- `/api/docs` - Interactive Swagger UI
- `/api/docs/openapi.json` - Raw OpenAPI spec

## Auto-Inference

Bunbox automatically infers documentation from your code:

```typescript
// app/api/users/route.ts
export const listUsers = route.get().handle(async (ctx) => {
  return { users: [] };
});

export const createUser = route.post().body(UserSchema).handle(async (ctx) => {
  return { user: ctx.body };
});
```

This generates:
- **operationId**: `listUsers`, `createUser` (from export names)
- **summary**: "List users", "Create user" (auto-formatted)
- **tags**: `["users"]` (from path `/api/users`)
- **requestBody**: Schema from `.body()` validation

## Adding Metadata

Use `.meta()` for explicit documentation:

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
});

export const createUser = route
  .post()
  .meta({
    summary: "Create a new user",
    description: "Creates a user account. Requires admin privileges.",
    tags: ["users", "admin"],
    deprecated: false,
    responses: {
      201: { description: "User created successfully" },
      409: { description: "Email already exists" },
    },
  })
  .body(CreateUserSchema)
  .handle(async (ctx) => {
    // ctx.body is typed as { name: string, email: string, role: "admin" | "user" }
    return ctx.json({ user: ctx.body }, 201);
  });
```

## Schema Support

Zod schemas are automatically converted to JSON Schema:

```typescript
const QuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export const getUser = route
  .get()
  .params(ParamsSchema)
  .query(QuerySchema)
  .handle(async (ctx) => {
    // ctx.params.id is validated as UUID
    // ctx.query.page defaults to 1
    return { user: await findUser(ctx.params.id) };
  });
```

### Supported Zod Types

| Zod Type | JSON Schema |
|----------|-------------|
| `z.string()` | `{ type: "string" }` |
| `z.number()` | `{ type: "number" }` |
| `z.boolean()` | `{ type: "boolean" }` |
| `z.object({})` | `{ type: "object", properties: {...} }` |
| `z.array(T)` | `{ type: "array", items: T }` |
| `z.enum([...])` | `{ enum: [...] }` |
| `z.union([A, B])` | `{ oneOf: [A, B] }` |
| `z.optional(T)` | Removes from `required` |
| `z.nullable(T)` | `{ type: ["string", "null"] }` |
| `z.default(T, v)` | `{ default: v }` |

### String Validations

```typescript
z.string().email()      // format: "email"
z.string().url()        // format: "uri"
z.string().uuid()       // format: "uuid"
z.string().datetime()   // format: "date-time"
z.string().min(1)       // minLength: 1
z.string().max(100)     // maxLength: 100
```

### Number Validations

```typescript
z.number().int()        // type: "integer"
z.number().min(0)       // minimum: 0
z.number().max(100)     // maximum: 100
```

## Configuration Options

```typescript
// bunbox.config.ts
export default {
  openapi: {
    // Enable/disable OpenAPI generation
    enabled: true,

    // Base path for docs (default: "/api/docs")
    path: "/api/docs",

    // API metadata
    title: "My API",
    version: "1.0.0",
    description: "A powerful API built with Bunbox",

    // Server URLs for the spec
    servers: [
      { url: "https://api.example.com", description: "Production" },
      { url: "http://localhost:3000", description: "Development" },
    ],
  },
};
```

## Customizing the Path

Change where the docs are served:

```typescript
export default {
  openapi: {
    enabled: true,
    path: "/swagger",  // Swagger UI at /swagger, spec at /swagger/openapi.json
  },
};
```

## Build-Time Generation

Generate the spec at build time for CI/CD:

```typescript
import { generateOpenAPISpec, writeOpenAPISpec } from "@ademattos/bunbox";

// Generate spec object
const spec = await generateOpenAPISpec("./app", {
  title: "My API",
  version: "1.0.0",
});

// Write to file
const path = await writeOpenAPISpec("./app", {
  title: "My API",
  version: "1.0.0",
});
// Writes to .bunbox/openapi.json
```

## Using with External Tools

The OpenAPI spec works with:
- **Postman** - Import `/api/docs/openapi.json`
- **Insomnia** - Import from URL
- **OpenAPI Generator** - Generate client SDKs
- **Stoplight** - API design tools

```bash
# Example: Generate TypeScript client
npx openapi-generator-cli generate \
  -i http://localhost:3000/api/docs/openapi.json \
  -g typescript-fetch \
  -o ./client
```
