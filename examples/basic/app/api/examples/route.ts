/**
 * API Route Examples using the new fluent route builder.
 */

import { route } from "@ademattos/bunbox";
import { z } from "zod";

// 1) Simple GET with typed query params
const QuerySchema = z.object({
  filter: z.string().default("all"),
});

export const getExamples = route
  .get()
  .query(QuerySchema)
  .handle(({ query }) => ({
    message: "Simple route, fully typed",
    filter: query.filter,
    timestamp: new Date().toISOString(),
  }));

// 2) Shared middleware (auth) that augments the context
const withAuth = route.use(() => {
  // You could verify a token here. We'll just fake a user.
  return {
    user: {
      id: "user_123",
      name: "Alice",
      roles: ["admin"],
    },
  };
});

// 3) Typed POST body
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
});

export const createExample = withAuth
  .post()
  .body(CreateUserSchema)
  .handle(({ body, user }) => ({
    id: Math.random().toString(36).substring(7),
    ...body,
    createdBy: user.name,
  }));

// 4) PUT route using both auth middleware and typed body
const UpdateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

export const updateExample = withAuth
  .put()
  .body(UpdateSchema)
  .handle(({ body, user }) => ({
    success: true,
    updated: body,
    editor: user.name,
  }));
