/**
 * API Route: GET /api/health
 * Ultra-minimal health check
 */

import { route } from "@ademattos/bunbox";

export const healthCheck = route.get().handle(() => ({
  status: "healthy",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));
