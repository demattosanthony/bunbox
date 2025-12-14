/**
 * Auth middleware - allows public access to /auth routes
 * Overrides the root middleware that requires authentication
 */

import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware({ request }: MiddlewareContext) {
  // Allow public access to auth routes
  // Return empty object to not add anything to context
  return {};
}
