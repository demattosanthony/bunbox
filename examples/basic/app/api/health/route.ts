/**
 * API Route: GET /api/health
 * Health check endpoint with typed response
 */

import { defineRoute, schema } from "@ademattos/bunbox";

// Define response schema
const healthResponseSchema = schema.object({
  status: schema.string(),
  timestamp: schema.string(),
  uptime: schema.number(),
});

export const GET = defineRoute({
  response: healthResponseSchema,
  handler: async () => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },
});
