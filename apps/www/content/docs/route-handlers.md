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

export const GET = route.handle<User>(async (ctx) => {
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
export const POST = route.handle(async (ctx) => {
  const body = ctx.body; // Already parsed JSON
  return { received: body };
});
```

## Response Helpers

Use built-in response helpers:

```typescript
export const GET = route.handle(async (ctx) => {
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
export const POST = route.handle(async (ctx) => {
  return ctx.json({ created: true }, 201);
});

export const DELETE = route.handle(async (ctx) => {
  return ctx.json({ deleted: true }, 204);
});
```

## Error Responses

Return error responses:

```typescript
import { error } from "@ademattos/bunbox";

export const GET = route.handle(async (ctx) => {
  if (!ctx.query.id) {
    return error("ID is required", 400);
  }

  return { id: ctx.query.id };
});
```

## Async Handlers

All handlers support async operations:

```typescript
export const GET = route.handle(async (ctx) => {
  const data = await fetchFromDatabase();
  const processed = await processData(data);
  return { result: processed };
});
```

## Redirect

Redirect to another URL:

```typescript
export const GET = route.handle(async (ctx) => {
  return Response.redirect("/new-url", 302);
});
```

## File Downloads

Send files as downloads:

```typescript
export const GET = route.handle(async (ctx) => {
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
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const GET = route.handle(async (ctx) => {
  return { users: await getUsers() };
});

export const POST = route.body(userSchema).handle(async (ctx) => {
  return { user: await createUser(ctx.body) };
});

export const PUT = route.body(userSchema).handle(async (ctx) => {
  return { user: await updateUser(ctx.params.id, ctx.body) };
});

export const DELETE = route.handle(async (ctx) => {
  await deleteUser(ctx.params.id);
  return { deleted: true };
});
```
