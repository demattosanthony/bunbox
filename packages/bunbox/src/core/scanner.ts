/**
 * File scanner to discover routes
 */

import { join } from "path";
import { filePathToRoute } from "./router";
import type { Route } from "./types";

const PAGE_PATTERNS = [
  "**/page.tsx",
  "**/page.ts",
  "**/page.jsx",
  "**/page.js",
];
const ROUTE_PATTERNS = [
  "**/route.tsx",
  "**/route.ts",
  "**/route.jsx",
  "**/route.js",
];
const LAYOUT_PATTERNS = [
  "**/layout.tsx",
  "**/layout.ts",
  "**/layout.jsx",
  "**/layout.js",
];

/**
 * Recursively scan directory for files matching patterns
 */
async function scanFiles(dir: string, patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  try {
    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern);
      const entries = await Array.fromAsync(glob.scan({ cwd: dir }));
      files.push(...entries);
    }
  } catch {
    // Directory doesn't exist, return empty array
  }
  return files;
}

/**
 * Scan for page routes in app/ directory
 */
export async function scanPageRoutes(appDir: string): Promise<Route[]> {
  const files = await scanFiles(appDir, PAGE_PATTERNS);
  const routes: Route[] = [];

  for (const file of files) {
    // Exclude API and WebSocket directories
    if (file.startsWith("api/") || file.startsWith("ws/")) continue;
    routes.push(filePathToRoute(file, "page"));
  }

  return routes;
}

/**
 * Scan for API routes in app/api/ directory
 */
export async function scanApiRoutes(appDir: string): Promise<Route[]> {
  const apiDir = join(appDir, "api");
  const files = await scanFiles(apiDir, ROUTE_PATTERNS);
  const routes: Route[] = [];

  for (const file of files) {
    routes.push(filePathToRoute(`api/${file}`, "api"));
  }

  return routes;
}

/**
 * Scan for WebSocket routes in ws/ directory
 */
export async function scanWsRoutes(wsDir: string): Promise<Route[]> {
  const files = await scanFiles(wsDir, ROUTE_PATTERNS);
  const routes: Route[] = [];

  for (const file of files) {
    routes.push(filePathToRoute(`ws/${file}`, "ws"));
  }

  return routes;
}

/**
 * Scan for socket routes in sockets/ directory
 */
export async function scanSocketRoutes(socketsDir: string): Promise<Route[]> {
  const files = await scanFiles(socketsDir, ROUTE_PATTERNS);
  const routes: Route[] = [];

  for (const file of files) {
    routes.push(filePathToRoute(`sockets/${file}`, "socket"));
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
  const files = await scanFiles(appDir, LAYOUT_PATTERNS);

  for (const file of files) {
    const dir = file.replace(/\/?layout\.(tsx|ts|jsx|js)$/, "");
    const routePath =
      dir === "" || dir === "/" ? "/" : `/${dir.replace(/^app\/?/, "")}`;
    layouts.set(routePath, file);
  }

  return layouts;
}

/**
 * Scan for worker file (worker.ts) in app directory
 */
export async function scanWorker(appDir: string): Promise<string | null> {
  const patterns = ["worker.ts", "worker.tsx", "worker.js", "worker.jsx"];

  for (const pattern of patterns) {
    const workerPath = join(appDir, pattern);
    try {
      const file = Bun.file(workerPath);
      if (await file.exists()) {
        return pattern;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}
