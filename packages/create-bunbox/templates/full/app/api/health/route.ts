/**
 * API Route: GET /api/health
 * Health check endpoint
 */

import { route } from "@ademattos/bunbox";

export const GET = route.handle(() => ({
  status: "healthy",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));
