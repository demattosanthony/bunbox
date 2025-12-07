---
title: Route Handlers
description: Advanced route handling patterns
order: 10
category: API Routes
---

## Type-Safe Handlers

Create fully type-safe route handlers:

```typescript
import { route } from "@ademattos/bunbox";

interface User {
  id: string;
  name: string;
  email: string;
}

export const getUser = route.get().handle<User>(async (ctx) => {
  return {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
  };
});
```

## Request Body

Access and parse request bodies:

```typescript
export const createUser = route.post().handle(async (ctx) => {
  const body = ctx.body; // Already parsed JSON
  return { received: body };
});
```

## Response Helpers

Use built-in response helpers:

```typescript
export const getUser = route.get().handle(async (ctx) => {
  // JSON response with ctx.json helper
  return ctx.json({ data: "hello" });

  // Or return directly (auto-wrapped in JSON)
  return { data: "hello" };

  // Custom status code
  return ctx.json({ created: true }, 201);
});
```

## Custom Status Codes

Return custom status codes:

```typescript
export const createUser = route.post().handle(async (ctx) => {
  return ctx.json({ created: true }, 201);
});

export const deleteUser = route.delete().handle(async (ctx) => {
  return ctx.json({ deleted: true }, 204);
});
```

## Error Responses

Return error responses:

```typescript
import { route, error } from "@ademattos/bunbox";

export const getUser = route.get().handle(async (ctx) => {
  if (!ctx.query.id) {
    return error("ID is required", 400);
  }

  return { id: ctx.query.id };
});
```

## Async Handlers

All handlers support async operations:

```typescript
export const getData = route.get().handle(async (ctx) => {
  const data = await fetchFromDatabase();
  const processed = await processData(data);
  return { result: processed };
});
```

## Redirect

Redirect to another URL:

```typescript
export const redirect = route.get().handle(async (ctx) => {
  return Response.redirect("/new-url", 302);
});
```

## File Downloads

Send files as downloads:

```typescript
export const downloadReport = route.get().handle(async (ctx) => {
  const file = Bun.file("./data/report.pdf");

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=report.pdf",
    },
  });
});
```

## Handling Multiple Methods

Handle multiple HTTP methods in one file:

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const listUsers = route.get().handle(async (ctx) => {
  return { users: await getUsers() };
});

export const createUser = route.post().body(UserSchema).handle(async (ctx) => {
  return { user: await createUser(ctx.body) };
});

export const updateUser = route.put().body(UserSchema).handle(async (ctx) => {
  return { user: await updateUser(ctx.params.id, ctx.body) };
});

export const deleteUser = route.delete().handle(async (ctx) => {
  await deleteUser(ctx.params.id);
  return { deleted: true };
});
```

## Query Parameters

Validate query parameters:

```typescript
const QuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  search: z.string().optional(),
});

export const listUsers = route
  .get()
  .query(QuerySchema)
  .handle(async (ctx) => {
    // ctx.query is typed as { page: number, limit: number, search?: string }
    return { users: [], page: ctx.query.page };
  });
```

## Path Parameters

Validate path parameters:

```typescript
const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export const getUser = route
  .get()
  .params(ParamsSchema)
  .handle(async (ctx) => {
    // ctx.params.id is validated as UUID
    return { user: await findUser(ctx.params.id) };
  });
```

## OpenAPI Metadata

Add documentation metadata to routes:

```typescript
export const createUser = route
  .post()
  .meta({
    summary: "Create a new user",
    description: "Creates a user with the provided details",
    tags: ["users"],
    responses: {
      201: { description: "User created" },
      409: { description: "Email already exists" },
    },
  })
  .body(UserSchema)
  .handle(async (ctx) => {
    return ctx.json({ user: ctx.body }, 201);
  });
```

See [OpenAPI & Swagger](/docs/openapi) for auto-generated API documentation.
