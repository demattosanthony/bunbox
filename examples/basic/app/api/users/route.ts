/**
 * Example Users API Route for demonstrating useQuery
 */

import { route } from "@ademattos/bunbox";
import { z } from "zod";

// Simulate a simple in-memory database
const users = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "user" },
  { id: "3", name: "Carol White", email: "carol@example.com", role: "user" },
];

// GET /api/users - List all users with optional filter
const QuerySchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
});

export const listUsers = route
  .get()
  .query(QuerySchema)
  .handle(({ query }) => {
    let filteredUsers = users;

    if (query.role) {
      filteredUsers = users.filter((u) => u.role === query.role);
    }

    return {
      users: filteredUsers,
      total: filteredUsers.length,
      timestamp: new Date().toISOString(),
    };
  });

// POST /api/users - Create a new user
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  role: z.enum(["admin", "user"]).default("user"),
});

export const createUser = route
  .post()
  .body(CreateUserSchema)
  .handle(({ body }) => {
    const newUser = {
      id: String(users.length + 1),
      ...body,
    };

    users.push(newUser);

    return {
      user: newUser,
      message: "User created successfully",
    };
  });
