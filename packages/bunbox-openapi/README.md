# @ademattos/bunbox-openapi

OpenAPI/Swagger documentation plugin for [Bunbox](https://github.com/demattosanthony/bunbox).

## Features

- Automatic OpenAPI 3.1 spec generation from your API routes
- Swagger UI for interactive API documentation
- Zero runtime dependencies (Swagger UI loaded from CDN)
- Full Zod schema support for request/response validation
- Type-safe route metadata

## Installation

```bash
bun add @ademattos/bunbox-openapi
```

## Usage

### Basic Setup

```typescript
// In your server setup
import { openapi } from "@ademattos/bunbox-openapi";

const openapiPlugin = openapi({
  title: "My API",
  version: "1.0.0",
  description: "My awesome API",
});

// Use in your request handler
if (openapiPlugin.matchesRoute(pathname)) {
  return openapiPlugin.handleRequest(pathname, appDir);
}
```

### Configuration Options

```typescript
openapi({
  // API title shown in Swagger UI
  title: "My API",

  // API version
  version: "1.0.0",

  // API description
  description: "My awesome API documentation",

  // Base path for docs (default: '/api/docs')
  path: "/api/docs",

  // Server URLs
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "http://localhost:3000", description: "Development" },
  ],
});
```

### API Routes with Metadata

Your API routes automatically get documented. Add metadata for better docs:

```typescript
// app/api/users/route.ts
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const listUsers = route
  .get()
  .meta({
    summary: "List all users",
    description: "Returns a paginated list of users",
    tags: ["users"],
  })
  .handle(() => {
    return { users: [] };
  });

export const createUser = route
  .post()
  .body(UserSchema)
  .meta({
    summary: "Create a new user",
    tags: ["users"],
  })
  .handle(({ body }) => {
    return { user: body };
  });
```

### Accessing Documentation

Once configured, access your API documentation at:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs/openapi.json`

## Programmatic Usage

### Generate OpenAPI Spec

```typescript
import { generateOpenAPISpec } from "@ademattos/bunbox-openapi";

const spec = await generateOpenAPISpec("./app", {
  title: "My API",
  version: "1.0.0",
});

console.log(JSON.stringify(spec, null, 2));
```

### Write Spec to File

```typescript
import { writeOpenAPISpec } from "@ademattos/bunbox-openapi";

const outputPath = await writeOpenAPISpec("./app", {
  title: "My API",
  version: "1.0.0",
});

console.log(`OpenAPI spec written to ${outputPath}`);
```

### Zod to JSON Schema

```typescript
import { zodToJsonSchema, isZodSchema } from "@ademattos/bunbox-openapi";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

const jsonSchema = zodToJsonSchema(UserSchema);
// {
//   type: "object",
//   properties: {
//     name: { type: "string", minLength: 1 },
//     email: { type: "string", format: "email" },
//     age: { type: "integer", minimum: 0 }
//   },
//   required: ["name", "email"]
// }
```

## License

MIT
