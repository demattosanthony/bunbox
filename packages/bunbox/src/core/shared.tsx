/**
 * Shared utilities safe for both client and server
 * No Node.js-specific APIs (like process) allowed here
 */

import { createContext } from "react";

/**
 * Get applicable layout paths for a URL path
 * Returns an array of layout paths from root to most specific
 */
export function getApplicableLayoutPaths(pathname: string): string[] {
  const layoutPaths: string[] = [];
  const pathParts = pathname.split("/").filter(Boolean);

  // Add root layout
  layoutPaths.push("/");

  // Add nested layout paths
  let currentPath = "";
  for (const part of pathParts) {
    currentPath += "/" + part;
    layoutPaths.push(currentPath);
  }

  return layoutPaths;
}

/**
 * SSR Router context to provide pathname during server-side rendering
 */
export const SSRRouterContext = createContext<{
  pathname: string;
  params: Record<string, string>;
} | null>(null);

