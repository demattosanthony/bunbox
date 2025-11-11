/**
 * File scanner to discover routes
 */

import { join } from "path";
import { filePathToRoute, type Route } from "./router";

/**
 * Recursively scan directory for files matching a pattern
 * Uses Bun.Glob for optimal performance
 */
async function scanFiles(dir: string, pattern: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const glob = new Bun.Glob(pattern);
    const entries = await Array.fromAsync(glob.scan({ cwd: dir }));
    files.push(...entries);
  } catch (error) {
    // Directory doesn't exist, return empty array
  }

  return files;
}

/**
 * Scan for page routes in app/ directory
 */
export async function scanPageRoutes(appDir: string): Promise<Route[]> {
  const routes: Route[] = [];

  // Scan for all page files, excluding the api directory
  const patterns = ["**/page.tsx", "**/page.ts", "**/page.jsx", "**/page.js"];

  for (const pattern of patterns) {
    const files = await scanFiles(appDir, pattern);
    for (const file of files) {
      // Exclude files in the api directory
      if (!file.startsWith("api/")) {
        const route = filePathToRoute(file, "page");
        routes.push(route);
      }
    }
  }

  return routes;
}

/**
 * Scan for API routes in app/api/ directory
 */
export async function scanApiRoutes(appDir: string): Promise<Route[]> {
  const apiDir = join(appDir, "api");
  const routes: Route[] = [];

  // Scan for all route files in the api directory
  const patterns = [
    "**/route.tsx",
    "**/route.ts",
    "**/route.jsx",
    "**/route.js",
  ];

  for (const pattern of patterns) {
    const files = await scanFiles(apiDir, pattern);
    for (const file of files) {
      // Prepend 'api/' to maintain correct path structure
      const fullPath = join("api", file);
      const route = filePathToRoute(fullPath, "api");
      routes.push(route);
    }
  }

  return routes;
}

/**
 * Scan for WebSocket routes in ws/ directory
 */
export async function scanWsRoutes(wsDir: string): Promise<Route[]> {
  const routes: Route[] = [];

  // Scan for all route files in the ws directory
  const patterns = [
    "**/route.tsx",
    "**/route.ts",
    "**/route.jsx",
    "**/route.js",
  ];

  for (const pattern of patterns) {
    const files = await scanFiles(wsDir, pattern);
    for (const file of files) {
      const route = filePathToRoute(file, "ws");
      routes.push(route);
    }
  }

  return routes;
}

/**
 * Scan for layout files
 */
export async function scanLayouts(
  appDir: string
): Promise<Map<string, string>> {
  const layouts = new Map<string, string>();

  // Scan for all layout files
  const patterns = [
    "**/layout.tsx",
    "**/layout.ts",
    "**/layout.jsx",
    "**/layout.js",
  ];

  for (const pattern of patterns) {
    const files = await scanFiles(appDir, pattern);
    for (const file of files) {
      // Extract the directory path
      const dir = file.replace(/\/layout\.(tsx|ts|jsx|js)$/, "");
      const routePath = "/" + dir.replace(/^app\/?/, "");
      layouts.set(routePath === "/" ? "/" : routePath, file);
    }
  }

  return layouts;
}
