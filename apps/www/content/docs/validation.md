---
title: Validation
description: Validate request data with type safety
order: 12
category: API Routes
---

## Installing Zod

```bash
bun add zod
```

## Body Validation

Validate request bodies:

```typescript
import { route } from "@ademattos/bunbox";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

export const createUser = route
  .post()
  .body(createUserSchema)
  .handle(async (ctx) => {
    // ctx.body is typed and validated
    const { name, email, age } = ctx.body;

    return { user: { name, email, age } };
  });
```

## Query Validation

Validate query parameters:

```typescript
const searchSchema = z.object({
  q: z.string(),
  limit: z.coerce.number().default(10),
  offset: z.coerce.number().default(0),
});

export const searchItems = route
  .get()
  .query(searchSchema)
  .handle(async (ctx) => {
    const { q, limit, offset } = ctx.query;

    const results = await search(q, { limit, offset });
    return { results };
  });
```

## Params Validation

Validate route parameters:

```typescript
const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const getUser = route
  .get()
  .params(paramsSchema)
  .handle(async (ctx) => {
    // ctx.params.id is a valid UUID
    const user = await getUser(ctx.params.id);
    return { user };
  });
```

## Multiple Validators

Chain multiple validators:

```typescript
const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const updateUser = route
  .put()
  .params(paramsSchema)
  .body(bodySchema)
  .handle(async (ctx) => {
    const user = await updateUser(ctx.params.id, ctx.body);
    return { user };
  });
```

## Custom Error Messages

Provide custom error messages:

```typescript
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  age: z
    .number()
    .min(18, "Must be at least 18 years old")
    .max(120, "Invalid age"),
});

export const createUser = route
  .post()
  .body(userSchema)
  .handle(async (ctx) => {
    return { user: ctx.body };
  });
```

## Complex Validation

Use Zod's advanced features:

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{5}$/),
});

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["user", "admin"]),
  address: addressSchema,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
});

export const createUser = route
  .post()
  .body(userSchema)
  .handle(async (ctx) => {
    return { user: ctx.body };
  });
```

## Error Handling

Validation errors are automatically handled:

```typescript
// Invalid request returns 400:
// {
//   "error": "Invalid body: Expected string, received number"
// }
```

## Custom Validators

Use any validator with a `parse` method:

```typescript
class CustomValidator {
  parse(data: unknown) {
    if (typeof data !== "object") {
      throw new Error("Expected object");
    }
    return data;
  }
}

export const processData = route
  .post()
  .body(new CustomValidator())
  .handle(async (ctx) => {
    return { data: ctx.body };
  });
```

## Transformations

Transform data during validation:

```typescript
const userSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  name: z.string().transform((s) => s.trim()),
  createdAt: z.string().transform((s) => new Date(s)),
});

export const createUser = route
  .post()
  .body(userSchema)
  .handle(async (ctx) => {
    // email is lowercase, name is trimmed, createdAt is a Date
    return { user: ctx.body };
  });
```
