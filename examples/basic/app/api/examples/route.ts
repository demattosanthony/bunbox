/**
 * API Route Examples - Fully typed params, query, body, response
 */

import { api } from "@ademattos/bunbox";

// Simple GET with typed response
export const GET = api<any, any, any, { message: string; timestamp: string }>(
  (req) => ({
    message: "Simple route, fully typed",
    timestamp: new Date().toISOString(),
  })
);

// POST with typed body and response
export const POST = api<
  any,
  any,
  { name: string; email: string },
  { id: string; name: string; email: string }
>((req) => ({
  id: Math.random().toString(36).substring(7),
  name: req.body.name,
  email: req.body.email,
}));

// PUT with typed body and response
export const PUT = api<
  any,
  any,
  { title: string; content: string },
  { success: boolean; updated: { title: string; content: string } }
>((req) => ({
  success: true,
  updated: req.body,
}));
