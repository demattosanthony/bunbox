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
 * Generic route scanner
 */
async function scanRoutes(
  dir: string,
  patterns: string[],
  type: "page" | "api" | "ws" | "socket",
  pathPrefix?: string,
  excludePrefixes?: string[]
): Promise<Route[]> {
  const files = await scanFiles(dir, patterns);
  const routes: Route[] = [];

  for (const file of files) {
    // Check exclusions
    if (excludePrefixes?.some((prefix) => file.startsWith(prefix))) {
      continue;
    }

    const filepath = pathPrefix ? `${pathPrefix}/${file}` : file;
    routes.push(filePathToRoute(filepath, type));
  }

  return routes;
}

/**
 * Scan for page routes in app/ directory
 */
export async function scanPageRoutes(appDir: string): Promise<Route[]> {
  return scanRoutes(appDir, PAGE_PATTERNS, "page", undefined, ["api/", "ws/"]);
}

/**
 * Scan for API routes in app/api/ directory
 */
export async function scanApiRoutes(appDir: string): Promise<Route[]> {
  const apiDir = join(appDir, "api");
  return scanRoutes(apiDir, ROUTE_PATTERNS, "api", "api");
}

/**
 * Scan for WebSocket routes in ws/ directory
 */
export async function scanWsRoutes(wsDir: string): Promise<Route[]> {
  return scanRoutes(wsDir, ROUTE_PATTERNS, "ws", "ws");
}

/**
 * Scan for socket routes in sockets/ directory
 */
export async function scanSocketRoutes(socketsDir: string): Promise<Route[]> {
  return scanRoutes(socketsDir, ROUTE_PATTERNS, "socket", "sockets");
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

const JOB_PATTERNS = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.js",
  "**/*.jsx",
];

/**
 * Scan for job files in app/jobs/ directory
 * Returns array of job file paths relative to the jobs directory
 */
export async function scanJobs(appDir: string): Promise<string[]> {
  const jobsDir = join(appDir, "jobs");
  const jobs: string[] = [];

  try {
    const dirExists = await Bun.file(jobsDir).exists().catch(() => false);
    // Check if jobs directory exists by trying to scan it
    for (const pattern of JOB_PATTERNS) {
      const glob = new Bun.Glob(pattern);
      const entries = await Array.fromAsync(glob.scan({ cwd: jobsDir }));
      jobs.push(...entries);
    }
  } catch {
    // Directory doesn't exist, return empty array
  }

  // Return unique entries (in case of duplicates from multiple patterns)
  return [...new Set(jobs)];
}
