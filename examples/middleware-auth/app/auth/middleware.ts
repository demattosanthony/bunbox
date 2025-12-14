/**
 * Auth middleware - allows public access to /auth routes
 * Overrides the root middleware to allow unauthenticated access
 */

import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware(_context: MiddlewareContext) {
  // Allow public access to all /auth routes
  // Returning empty object stops parent middleware execution
  return {};
}
