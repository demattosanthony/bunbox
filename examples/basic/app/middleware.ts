/**
 * Root middleware - protects all routes
 * Child routes can override this by defining their own middleware
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
  // For demo purposes, we'll just pass through
  return {
    user: {
      id: "demo_user",
      name: "Demo User",
      email: "demo@example.com",
    },
  };
}
