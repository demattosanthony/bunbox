/**
 * Root middleware - protects all routes except /auth
 * Demonstrates authentication middleware pattern
 */

import { redirect, getCookie } from "@ademattos/bunbox";
import type { MiddlewareContext } from "@ademattos/bunbox";

export async function middleware({ request }: MiddlewareContext) {
  // Check for auth cookie
  const authToken = getCookie(request, "auth_token");

  if (!authToken) {
    // Not authenticated - redirect to login
    return redirect("/auth/login");
  }

  // In a real app, you would validate the token here
  // For demo purposes, we'll parse a simple token format: "user:{id}:{role}"
  const [, userId, role] = authToken.split(":");

  // Return user data to be available in loaders and pages
  return {
    user: {
      id: userId || "unknown",
      role: role || "user",
    },
  };
}
