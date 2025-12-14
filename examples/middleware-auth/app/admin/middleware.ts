/**
 * Admin middleware - requires admin role
 * Demonstrates role-based access control
 */

import { redirect } from "@ademattos/bunbox";
import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware({ context }: MiddlewareContext) {
  // Parent middleware already validated auth and added user to context
  const user = context.user as { id: string; role: string } | undefined;

  // Check if user has admin role
  if (!user || user.role !== "admin") {
    // Redirect non-admin users back to dashboard
    return redirect("/dashboard");
  }

  // Admin access granted - pass user through
  return { user };
}
