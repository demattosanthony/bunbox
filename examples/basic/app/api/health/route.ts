/**
 * API Route: GET /api/health
 * Ultra-minimal health check
 */

import { api } from "@ademattos/bunbox";

export const GET = api((req) => ({
  status: "healthy",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));
